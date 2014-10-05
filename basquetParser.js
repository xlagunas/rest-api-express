/**
 * Created by xavi on 10/4/14.
 */

var schedule    = require('node-schedule'),
    minify      = require('html-minifier').minify,
    request     = require('request'),
    cheerio     = require('cheerio'),
    async       = require('async');

var regions = {
    codename: 'tipus'
    , zones: [
        { id: '08', name: 'Barcelona'},
        { id: '17', name: 'Girona'},
        { id: '25', name: 'Lleida'},
        { id: '43', name: 'Tarragona'}
    ]
};

var genres = [
    { id: 'M', name: 'Masculí'},
    { id: 'F', name: 'Femení'},
    { id: 'X', name: 'Mixte'}
];

var competitionRegions = [
    { id: '1', name: 'Catalunya'},
    { id: '2', name: 'Barcelona'},
    { id: '3', name: 'Girona'},
    { id: '4', name: 'Lleida'},
    { id: '5', name: 'Tarragona'}
];

var updateFranchisesDataBase = function (url) {
    request.post(url, {form: JSON.stringify({test:'test'})});
    if (req.statusCode === 200) {
        console.log('Update successfully done');
    } else {
        console.log('Error updating franchises');
    }
};

var asyncGeneralFranchiseInfo = function (region) {
    return function(callback) {
        request.post({
            headers: {'content-type' : 'application/x-www-form-urlencoded'},
            url: "http://basquetcatala.cat/clubs/buscar",
            body:    regions.codename+'='+region.id
        }, function(err, response, html){
            if(err && response.statusCode !== 200){
                callback(error);
            }
            else {
                minify(html, { removeComments: true });
                var $ = cheerio.load(html);
                var franchises = [];
                $(".llistat >li").each(function(i, element){
                    var franchise = {};
                    franchise.name = $(this).text();
                    franchise.url = $(this).children('a').attr('href');
                    franchise.region = region;
                    franchises.push(franchise);
                });
                callback(null, franchises);
            }
        });
    };
}
var asyncDetailedFranchiseInfo = function (franchise) {
    return function (callback) {
        request({url: 'http://www.basquetcatala.cat/'+franchise.url },
            function(err, response, html){
                if(err) callback(err);
                else{
                    html = minify(html, { removeComments: true });
                    $ = cheerio.load(html);

                    var club = {};
                    club.image = $("#dades-equip").find("#img-club div img").attr("src");
                    club.calendars = $(".none").find('a').attr("href");
                    club.name = $("h2").text();
                    var address = "";
                    $("#dades-equip").contents().each(function(i, item){
                        if ($(item).is('h4')){
                            var contentType;
                            if ($(item).text() == 'Adreça de contacte de l\'entitat:')
                                contentType = 'address';
                            else if ($(item).text() == 'President/a:')
                                contentType = 'president';

                            while ($(item).next().is('p')){
                                item = $(item).next();
                                var a = $(item).text().replace('\n\t\t\t',' ');
                                club[contentType] = a;
                            }
                        }
                    });
            club.categories = [];
            $(".equips-llista").contents().each(function(i, item){
                if ($(item).children().is('h4')){
                    var category = {};
                    category.name = $(item).text();
                    category.teams = [];
                    while ($(item).next().children().is('a')){
                        var team = {};
                        item = $(item).next();
                        team.name = $(item).children().text();
                        team.url = $(item).children().attr('href');
                        category.teams.push(team)
                    }
                    club.categories.push(category);
                }
            });
                    callback(null, club);
                }
            });
    }
}

var asyncRequests = function (postUrl) {
    var tasks = [];

    regions.zones.forEach(function(region){
        tasks.push(asyncGeneralFranchiseInfo(region));
    });
    console.log('About to start at ' +new Date());
    async.waterfall([
        function(callback) {
            async.parallel(tasks, function(error, callback2){
                if (error) console.log(error);
                else{
                    var franchises = [];
                    franchises = [].concat.apply([], callback2);
                    callback(null, franchises);
                }
            });
        },
        function(franchises, callback) {
            var teamTasks = [];
            franchises.forEach(function(franchise){
                teamTasks.push(asyncDetailedFranchiseInfo(franchise));
            });
            async.parallel(teamTasks, function(error, callback3){
                callback(null, [].concat.apply([], callback3));
            });

        }], function (error, result) {
        if (error) console.log("Error al callback final "+ error);
        else{
            console.log(JSON.stringify(result));
            console.log('finished at '+new Date());
            request({uri: postUrl, method: 'POST', json:result},
            function (error, response, html){
                if (error) console.log(error);
                else{
                    console.log('successfully posted to server');
                    console.log(html);
                }
            });
        }

    });
}

module.exports.updateFranchisesDataBase = updateFranchisesDataBase;
module.exports.asyncRequests = asyncRequests;
