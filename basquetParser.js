/**
 * Created by xavi on 10/4/14.
 */

var schedule    = require('node-schedule'),
    minify      = require('html-minifier').minify,
    syncRequest = require('sync-request'),
    request     = require('request'),
    cheerio     = require('cheerio');

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

var getTeamDataSync = function (url){
    var req = syncRequest('GET', 'http://www.basquetcatala.cat/'+url);
    if (req.statusCode === 200) {
        var html = req.body.toString();
        html = minify(html, { removeComments: true });
        $ = cheerio.load(html);

        var club = {};
        club.categories = [];
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
        return club;
    }
};

var parseFranchiseData = function (body){
    var html = body.toString();
    minify(html, { removeComments: true });
    var clubs = [];
    var $ = cheerio.load(html);
    var text = $(".llistat >li").each(function(i, element){
        var team = {};
        team.name = $(this).text();
        team.url = $(this).children('a').attr('href');
        clubs.push(getTeamDataSync(team.url));
    });
    return clubs;
};

var obtainFranchiseSync = function () {
    regions.zones.forEach(function(region){
        var franchise = syncRequest('POST', 'http://basquetcatala.cat/clubs/buscar');

        if (franchise.statusCode == 200){
            return parsedFranchises = parseFranchiseData(franchise.body);
        }
        else
            console.log('error');
    });
};

var updateFranchisesDataBase = function (url) {
//    var parsedFranchises = obtainFranchiseSync();
//    var req = syncRequest('POST', url, {json: true, body: JSON.stringify(parsedFranchises)});
    request.post(url, {form: JSON.stringify({test:'test'})});
    if (req.statusCode === 200) {
        console.log('Update successfully done');
    } else {
        console.log('Error updating franchises');
    }
};

module.exports.updateFranchisesDataBase = updateFranchisesDataBase;
