module.exports = function(RED) {
	"use strict";
	var exec = require('child_process').exec;
	var spawn = require('child_process').spawn;
	var fs = require('fs');

	var gpioCommand = __dirname+'/nrgpio.sh';
	var gpioSudoCommand = __dirname+'/sudonrgpio.sh';

	var allOK = true;

        try {
		if ( !(1 & parseInt((fs.statSync(gpioCommand).mode & parseInt("777", 8)).toString(8)[0]) )) {
        	    RED.log.warn("asus-gpio : cannot exec shell nrgpio.sh.");
        	    allOK = false;
        	}
        } catch(err) {
        	allOK = false;
        	RED.log.warn("asus gpio error in init.");
    	}


	process.env.PYTHONUNBUFFERED = 1;

	var pinsInUse = {};

	function AsusGpioInputNode(n) {
		RED.nodes.createNode(this,n);
		this.buttonState = -1;
		this.pin = n.pin;
		this.intype = n.intype;
		this.read = n.read || false;
		this.debounce = Number(n.debounce || 25);
		if (this.read) {this.buttonState = -2;}


		//console.log("PIN in = " + this.pin);

		var node = this;


		if (allOK === true) {
			if (node.pin !== undefined) {
				node.child = spawn(gpioSudoCommand, ["in",node.pin,node.intype,node.debounce]);
                		node.running = true;
                		node.status({fill:"green",shape:"dot",text:"OK"});

                		node.child.stdout.on('data', function (data) {
                    			var d = data.toString().trim().split("\n");
 
					for (var i = 0; i < d.length; i++) {
                        			if (d[i] === '') { return; }
                        			if (node.running && node.buttonState !== -1 && !isNaN(Number(d[i])) && node.buttonState !== d[i]) {
                            				node.send({ topic:"linaro/"+node.pin, payload:Number(d[i]) });
                        			}
                        			node.buttonState = d[i];
                       				 node.status({fill:"green",shape:"dot",text:d[i]});
                        			if (RED.settings.verbose) { node.log("out: "+d[i]+" :"); }
                    			}
                		});


                		node.child.stderr.on('data', function (data) {
                    			if (RED.settings.verbose) { node.log("err: "+data+" :"); }
                		});


				node.child.on('close', function (code) {
					node.running = false;
					node.child = null;
					if (RED.settings.verbose) { node.log("CLOSE"); }
					if (node.done) {
						node.status({fill:"grey",shape:"ring",text:"CLOSED"});
						node.done();
					}
					else { node.status({fill:"red",shape:"ring",text:"STOPPED"}); }




				});


                		node.child.on('error', function (err) {
                    			if (err.errno === "ENOENT") { node.error("Error Occured 104."); }
                    			else if (err.errno === "EACCES") { node.error("Error Occured 105"); }
                  	  		else { node.error("Error Occured 105:" + err.errno); }
                		});


            		}
            		else {
                		node.warn("NOT Define: "+ node.pin);
            		}
        	}
        	else {
            		node.status({fill:"grey",shape:"dot",text:"Not available"});
            		if (node.read === true) {
                		var val;
                		if (node.intype == "up") { val = 1; }
                		if (node.intype == "down") { val = 0; }
                		setTimeout(function(){
                    			node.send({ topic:"linaro/"+node.pin, payload:val });
                    			node.status({fill:"grey",shape:"dot",text:""+val});
                		},250);
            		}
        	}



        	node.on("close", function(done) {
            		node.status({fill:"grey",shape:"ring",text:"closed"});
            		//delete pinsInUse[node.pin];
            		if (node.child != null) {
                		node.done = done;
                		node.child.stdin.write("close "+ node.pin);
                		node.child.kill('SIGKILL');
            		}
            		else { done(); }
        	});

    	}
	RED.nodes.registerType("asus gpio in", AsusGpioInputNode);


	function AsusGpioOutputNode(n) {

		RED.nodes.createNode(this,n);
		this.pin = n.pin;
        	this.set = n.set || false;
        	this.level = n.level || 0;

		//console.log("PIN out = " + this.pin);
		var node = this;

        	function inputlistener(msg) {
			//console.log("input= " + msg.payload);

            		if (msg.payload === "true") { msg.payload = true; }
            		if (msg.payload === "false") { msg.payload = false; }
            		var out = Number(msg.payload);
            		var limit = 1;
            		if ((out >= 0) && (out <= limit)) {
                		if (RED.settings.verbose) { node.log("out: "+out); }
                		if (node.child !== null) {
                    			node.child.stdin.write(out+"\n");
                    			node.status({fill:"green",shape:"dot",text:msg.payload.toString()});
                		}
                		else {
                    			node.error("output value error");
                    			node.status({fill:"red",shape:"ring",text:"output value error"});
                		}
            		}
            		else { node.warn("WARNING"); }
        	}

		if (allOK === true) {
            		if (node.pin !== undefined) {
                		if (node.set) {
                    			node.child = spawn(gpioCommand, ["out",node.pin,node.level]);
                    			node.status({fill:"green",shape:"dot",text:node.level});
                		} else {
                    			node.child = spawn(gpioCommand, ["out",node.pin]);
                    			node.status({fill:"green",shape:"dot",text:"OK"});
                		}
                		node.running = true;

                		node.on("input", inputlistener);
               			node.child.stdout.on('data', function (data) {
                    			if (RED.settings.verbose) { node.log("out: "+data+" :"); }
                		});

                		node.child.stderr.on('data', function (data) {
                    			if (RED.settings.verbose) { node.log("err: "+data+" :"); }
                		});

                		node.child.on('close', function (code) {
                    			node.child = null;
                    			node.running = false;
                    			if (RED.settings.verbose) { node.log("CLOSED"); }
                    			if (node.done) {
                        			node.status({fill:"grey",shape:"ring",text:"stop"});
                        			node.done();
                    			}
                    			else { node.status({fill:"red",shape:"ring",text:"stopped"}); }
                		});

                		node.child.on('error', function (err) {
                    			if (err.errno === "ENOENT") { node.error("Error Occured 100."); }
                   			else if (err.errno === "EACCES") { node.error("Error Occured 101."); }
                    			else { node.error("Error Occured 102:" + err.errno); }
                		});
            		}
            		else {
                		node.warn("NOT Define :"+ node.pin);
            		}
        	}
        	else {
            		node.status({fill:"grey",shape:"dot",text:"stop"});
            		node.on("input", function(msg){
                		node.status({fill:"grey",shape:"dot",text:"stop"});
            		});
        	}

		node.on("close", function(done) {
            		node.status({fill:"grey",shape:"ring",text:"closed"});
            		//delete pinsInUse[node.pin];
            		if (node.child != null) {
                		node.done = done;
                		node.child.stdin.write("close "+node.pin);
                		node.child.kill('SIGKILL');
            		}
            		else { done(); }
        	});


	}
	RED.nodes.registerType("asus gpio out", AsusGpioOutputNode);


}


