"use strict";

var fs = require('fs');
var exec = require('child_process').exec;

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

var nwbuild = nwbuild || {};

(function() {

    nwbuild.init = function(fixlibudev) {
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

        if (fixlibudev) {
            exec("cd node-webkit-v0.9.2-linux-x64/ && sed -i 's/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x30/\x75\x64\x65\x76\x2E\x73\x6F\x2E\x31/g' nw");
        }
    };

    nwbuild.build = function(name, callback) {
        rmdirrec("output");
        fs.mkdirSync("output");
        exec("zip -j output/"+name+".nw html/* js/* stylesheets/* package.json",
            callback);
    };

    nwbuild.package_linux = function(name, run) {
        fs.mkdirSync("output/linux");
        copyfiles(
            ['resources/node-webkit-v0.9.2-linux-x64/nw',
             'resources/node-webkit-v0.9.2-linux-x64/libffmpegsumo.so',
             'resources/node-webkit-v0.9.2-linux-x64/nw.pak',
             'output/'+name+'.nw'],
            ['output/linux/nw',
             'output/linux/libffmpegsumo.so',
             'output/linux/nw.pak',
             'output/linux/'+name+'.nw'],
            function(){
                console.log("linux package created at output/linux/");
                fs.chmodSync('output/linux/nw', '755')
                if(run) {
                    console.log("running linux package");
                    exec("./output/linux/nw output/linux/"+name+".nw");
                }
            });
    };

    nwbuild.package_windows = function(name, run) {
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
                exec("cat resources/node-webkit-v0.9.2-win-ia32/nw.exe output/"+name+".nw > output/windows/"+name+".exe", function(){
                    exec("zip -j output/windows/"+name+"-win.zip output/windows/*", function(){
                        console.log("windows package created at output/windows/"+name+"-win.zip");
                        if(run) {
                            console.log("running windows package");
                            exec("./output/windows/"+name+".exe");
                        }
                    });
                });
            });
    };

    nwbuild.package_mac = function (name, run) {
        fs.mkdirSync("output/macosx");
        exec("cp -R resources/node-webkit-v0.9.2-osx-ia32/node-webkit.app/ output/macosx/"+name+".app/", function(){
            exec("cp output/"+name+".nw output/macosx/"+name+".app/Contents/Resources/app.nw", function() {
                exec("cd output/macosx/ && zip -r "+name+"-osx.app.zip "+name+".app/*", function() {
                    console.log("mac-osx package created at output/macosx/"+name+"-osx.app.zip");
                    if(run) {
                        console.log("running mac osx package");
                        exec("./output/macosx/"+name+".app");
                    }
                });
            });
        });
    }

})();

if(typeof module !== "undefined")
    module.exports = nwbuild;
