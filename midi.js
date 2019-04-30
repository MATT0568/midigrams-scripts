var fs = require('fs');
const exec = require('child_process');
var midiConverter = require('midi-converter');
var dir = require('node-dir');

var songs = new Array();
var total_songs = 0;
var trackShell = {
    "header": {
        "formatType": 1,
        "trackCount": 2,
        "ticksPerBeat": 170
    },
    "tracks": [
        [
            {
                "deltaTime": 0,
                "type": "meta",
                "subtype": "timeSignature",
                "numerator": 4,
                "denominator": 4,
                "metronome": 24,
                "thirtyseconds": 8
            },
            {
                "deltaTime": 0,
                "type": "meta",
                "subtype": "setTempo",
                "microsecondsPerBeat": 300000
            },
            {
                "deltaTime": 0,
                "type": "meta",
                "subtype": "trackName",
                "text": "Tempo Track"
            },
            {
                "deltaTime": 0,
                "type": "meta",
                "subtype": "endOfTrack"
            }
        ],
        [
            {
                "deltaTime": 0,
                "type": "meta",
                "subtype": "trackName",
                "text": "New Instrument"
            },
            {
                "deltaTime": 10000,
                "type": "meta",
                "subtype": "endOfTrack"
            }
        ]
    ]
}
//-----------------------------------------------------
//CREATES JSON FILE FROM MIDI
//-----------------------------------------------------
// var filename = "nes-music\\Adventure_Island_-_Underworld.mid";
// var jsonSong = convertToJson(filename);
// jsonToFile(jsonSong);

//-----------------------------------------------------
//CREATES FILE NOTE STRING
//-----------------------------------------------------
// fileLoop();

//-----------------------------------------------------
//RUNS NGRAM.PL AND GETS SONG NOTES
//-----------------------------------------------------
var ngram = exec.execSync('perl ngram.pl 3 1 tracks.txt').toString();
ngramToFile(ngram);

//-----------------------------------------------------
//CREATES MIDI FROM NGRAM.PL OUTPUT
//-----------------------------------------------------
var notes = stringToArray(ngram);
var notes = fileToArray();
createJsonFile(notes);
convertToMidi(trackShell);


function fileLoop() {
    dir.readFiles('all-music/',
        function (err, content, fileName, next) {
            if (err) throw err;
            createBlueprint(fileName);
            next();
        },
        function (err, files) {
            if (err) throw err;
            //console.log(songs);
            totalsongs();
            //console.log(total_songs);
            convertToText(songs);
        });
}

function totalsongs() {
    for (var i = 0; i < songs.length; i++) {
        total_songs += songs[i].length;
    }
}

function createBlueprint(fileName) {
    //console.log(fileName);
    try {
        var jsonSong = convertToJson(fileName);
    } catch (error) {
        fs.unlink(fileName, (err) => {
            if (err) throw err;
            //console.log(fileName + ' was deleted');
        });
        return;
    }
    var passed = checkFiles(jsonSong);
    if (passed === false) {
        fs.unlink(fileName, (err) => {
            if (err) throw err;
            //console.log(fileName + ' was deleted');
        });
    }
    else {
        parsesongs(jsonSong);
    }
}

function checkFiles(jsonSong) {
    var tracks = jsonSong.tracks;
    var passed = true;

    for (track in tracks) {
        for (var item = 0; item < tracks[track].length - 1; item++) {
            if (tracks[track][item].subtype === "noteOn" && tracks[track][item + 1].subtype === "noteOn") {
                passed = false;
            }
            else if (tracks[track][item].subtype === "noteOff" && tracks[track][item - 1].subtype === "noteOff") {
                passed = false;
            }
        }
    }
    return passed;
}

function parsesongs(jsonSong) {
    var tracks = jsonSong.tracks;
    var parsedJson = "";
    var uniqueNotes = new Array();

    for (track in tracks) {
        //console.log(tracks[track].length);
        if (tracks[track].some(item => item.subtype === "noteOn") === false || tracks[track].length < 40) {
            continue;
        }
        //console.log(tracks[track].some(item => item.subtype === "noteOn"));
        for (var item = 0; item < tracks[track].length; item++) {
            if (tracks[track][item].subtype === "setTempo") {
                break;
            }
            else if (tracks[track][item].subtype === "endOfTrack") {
                //console.log("ENDOFTRACK");
                parsedJson += "? ";
            }
            else if (tracks[track][item].subtype === "noteOn" && tracks[track][item + 1].subtype === "noteOff") {
                parsedJson += (Math.round(tracks[track][item].deltaTime / 10) * 10) + ":" + tracks[track][item].noteNumber + ",";
                if (!uniqueNotes.includes(tracks[track][item].noteNumber)) {
                    uniqueNotes.push(tracks[track][item].noteNumber);
                }
            }
            else if (tracks[track][item].subtype === "noteOff" && tracks[track][item - 1].subtype === "noteOn") {
                parsedJson += (Math.round(tracks[track][item].deltaTime / 10) * 10) + ":" + tracks[track][item].noteNumber + "!";
            }
        }
        if (parsedJson !== "" && uniqueNotes.length > 20) {
            parsedJson = parsedJson.substring(0, parsedJson.length - 1);
            songs.push(parsedJson.split('!'));
            parsedJson = "";
        }
        uniqueNotes = [];
    }
}

function convertToText(songs) {
    for (song in songs) {
        for (note in songs[song]) {
            if (note < songs[song].length) {
                fs.appendFileSync('tracks.txt', songs[song][note] + " ");
            }
            else {
                fs.appendFileSync('tracks.txt', songs[song][note]);
            }
        }
    }
}

function convertToJson(file_name) {
    midiSong = fs.readFileSync(file_name, 'binary');
    jsonSong = midiConverter.midiToJson(midiSong);
    return jsonSong;
}

function jsonToFile(jsonSong) {
    fs.writeFileSync('example-json.json', JSON.stringify(jsonSong, null, 2));
}

function convertToMidi(newJson) {
    var newMidi = midiConverter.jsonToMidi(newJson);
    fs.writeFileSync('newMidi.mid', newMidi, 'binary');
}

function ngramToFile(ngram) {
    //console.log(ngram.length - 4);
    //var ngramFixed = ngram.substring(2, ngram.length - 3);
    fs.writeFileSync('song.txt', ngram, 'utf8');
}

function stringToArray(ngram) {
    //var ngram = fs.readFileSync("./song.txt", "utf8").trim();
    var notes = ngram.split(" ");
    console.log(notes);
    return notes;
}

function fileToArray() {
    var ngram = fs.readFileSync("./song.txt", "utf8").trim();
    var notes = ngram.split(" ");
    console.log(notes);
    return notes;
}

function createJsonFile(notes) {
    for (var note = 2; note < notes.length - 1; note++) {
        var noteOnOff = notes[note].split(",");
        var onNote = noteOnOff[0].split(":");
        var offNote = noteOnOff[1].split(":");

        var onNoteJson = {
            "deltaTime": onNote[0],
            "channel": 0,
            "type": "channel",
            "noteNumber": onNote[1],
            "velocity": 127,
            "subtype": "noteOn"
        }
        var offNoteJson = {
            "deltaTime": offNote[0],
            "channel": 0,
            "type": "channel",
            "noteNumber": offNote[1],
            "velocity": 127,
            "subtype": "noteOff"
        }
        trackShell.tracks[trackShell.tracks.length - 1].splice(trackShell.tracks[trackShell.tracks.length - 1].length - 2, 0, onNoteJson);
        trackShell.tracks[trackShell.tracks.length - 1].splice(trackShell.tracks[trackShell.tracks.length - 1].length - 2, 0, offNoteJson);
        console.log(note);
    }
    console.log(JSON.stringify(trackShell, null, 2));
}

// function printJson(jsonSong) {
//     console.log(JSON.stringify(jsonSong, null, 2));
// }

//console.log(JSON.stringify(jsonSong, null, 2));
//fs.writeFileSync('example-json.json', JSON.stringify(jsonSong, null, 2));

// console.log(JSON.stringify(jsonSong.header, null, 2));


