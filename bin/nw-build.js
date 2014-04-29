#!/usr/bin/env node
"use strict";

var fs = require('fs');
var exec = require('child_process').exec;
var program = require('commander');

// setup the command line interface
program
    .version('0.0.1')
    .option('-i, --init', 'initialize the environment')
    .option('-l, --libudev', 'fix libudev for recent versions of linux')

    .option('-o, --name [myapp]', 'Applications name, mandatory')
    .option('-r, --run', 'Run after build')
    .option('-l, --linux', 'Package for linux')
    .option('-w, --windows', 'Package for windows')
    .option('-m, --mac', 'Package for max osx')
    .option('-c, --config [type]', '[release] or [debug]', 'debug')
    .parse(process.argv);

// define helper functions
function rmdirrec(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                rmdirrec(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function copyfiles(inputs, destinations, callback) {
    var r = fs.createReadStream(inputs.pop());
    r.pipe(fs.createWriteStream(destinations.pop()));
    r.on('close', function(){
        if(inputs.length > 0) {
            copyfiles(inputs, destinations, callback)
        }
        else {
            callback();
        }
    });
}

// initialization of environment
if(program.init) {
    rmdirrec("resources");
    fs.mkdirSync("resources");
    exec("curl http://dl.node-webkit.org/v0.9.2/node-webkit-v0.9.2-linux-x64.tar.gz > resources/node-webkit-v0.9.2-linux-x64.tar.gz", function(){
        exec("cd resources/ && tar -xvzf node-webkit-v0.9.2-linux-x64.tar.gz");
    });

    exec("curl http://dl.node-webkit.org/v0.9.2/node-webkit-v0.9.2-win-ia32.zip > resources/node-webkit-v0.9.2-win-ia32.zip", function(){
        exec("cd resources/ && unzip node-webkit-v0.9.2-win-ia32.zip -d node-webkit-v0.9.2-win-ia32");
    });

    exec("curl http://dl.node-webkit.org/v0.9.2/node-webkit-v0.9.2-osx-ia32.zip > resources/node-webkit-v0.9.2-osx-ia32.zip", function(){
        exec("cd resources/ && unzip node-webkit-v0.9.2-osx-ia32.zip -d node-webkit-v0.9.2-osx-ia32");
    });

    if (program.libudev) {
        exec("cd node-webkit-v0.9.2-linux-x64/ && sed -i 's/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x30/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x31/g' nw");
    }
}

// build packages
if(!program.name) {
    console.log("No name supplied, aborting build")
    return;
}

rmdirrec("output");
fs.mkdirSync("output");
exec("zip -j output/"+program.name+".nw html/* js/* stylesheets/* package.json",
    create_packages);

function create_packages() {
    if (program.linux) {
        fs.mkdirSync("output/linux");
        copyfiles(
            ['resources/node-webkit-v0.9.2-linux-x64/nw',
             'resources/node-webkit-v0.9.2-linux-x64/libffmpegsumo.so',
             'resources/node-webkit-v0.9.2-linux-x64/nw.pak',
             'output/'+program.name+'.nw'],
            ['output/linux/nw',
             'output/linux/libffmpegsumo.so',
             'output/linux/nw.pak',
             'output/linux/'+program.name+'.nw'],
            function(){
                console.log("linux package created at output/linux/");
                fs.chmodSync('output/linux/nw', 0755)
                if(program.run) {
                    console.log("running linux package");
                    exec("./output/linux/nw output/linux/"+program.name+".nw");
                }
            });
    }

    if (program.windows) {
        fs.mkdirSync("output/windows");
        copyfiles(
            ['resources/node-webkit-v0.9.2-win-ia32/ffmpegsumo.dll',
             'resources/node-webkit-v0.9.2-win-ia32/icudt.dll',
             'resources/node-webkit-v0.9.2-win-ia32/libEGL.dll',
             'resources/node-webkit-v0.9.2-win-ia32/libGLESv2.dll',
             'resources/node-webkit-v0.9.2-win-ia32/nw.pak'],
            ['output/windows/ffmpegsumo.dll',
             'output/windows/icudt.dll',
             'output/windows/libEGL.dll',
             'output/windows/libGLESv2.dll',
             'output/windows/nw.pak'],
            function(){
                exec("cat resources/node-webkit-v0.9.2-win-ia32/nw.exe output/"+program.name+".nw > output/windows/"+program.name+".exe", function(){
                    exec("zip -j output/windows/"+program.name+"-win.zip output/windows/*", function(){
                        console.log("windows package created at output/windows/"+program.name+"-win.zip");
                        if(program.run) {
                            console.log("running windows package");
                            exec("./output/windows/"+program.name+".exe");
                        }
                    });
                });
            });
    }

    if (program.mac) {
        fs.mkdirSync("output/macosx");
        exec("cp -R resources/node-webkit-v0.9.2-osx-ia32/node-webkit.app/ output/macosx/"+program.name+".app/", function(){
            exec("cp output/"+program.name+".nw output/macosx/"+program.name+".app/Contents/Resources/app.nw", function() {
                exec("cd output/macosx/ && zip -r "+program.name+"-osx.app.zip "+program.name+".app/*", function() {
                    console.log("mac-osx package created at output/macosx/"+program.name+"-osx.app.zip");
                    if(program.run) {
                        console.log("running windows package");
                        exec("./output/macosx/"+program.name+".app");
                    }
                });
            });
        });
    }
}
