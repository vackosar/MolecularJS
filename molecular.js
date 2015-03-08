/*!
 * Molecular.js JavaScript Library v1.0
 * https://ssl-subj-key-id-2f89032b1f7ca04c44be-415a9362b9e3ffa994b9.eu/nonsecured/molecularJS/index.html
 *
 * Copyright 2014, 2050 Vaclav Kosar
 * Released under the MIT license
 *
 * Date: 2014-01-01
 */

function Vector(x, y) {
	this.x=x;
	this.y=y;
	this.plus=function(vector) {
		return new Vector(this.x+vector.x, this.y+vector.y);
	}
	this.minus=function(vector) {
		return new Vector(this.x-vector.x, this.y-vector.y);
	}
	this.product=function(vector) {
		return this.x*vector.x + this.y*vector.y;
	}
	this.multiply=function(scalar) {
		return new Vector(this.x*scalar, this.y*scalar);
	}
	this.norm=function() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	}
}
function Particle(position, speed, forceField, weight) {
	this.position=position;
	this.weight=weight;
	// not speed but step or speed * dt
	this.speed=speed;
	// not force but force * (dt)^2 * 0.5 
	this.forceField=forceField;
	this.color="lightgrey";
	this.radius=1.0;
	this.charge=1;
	this.getMovedParticle = function(position) {
		var speed=position.minus(this.position);
		particle = new Particle(position, speed, this.forceField, 1); 
		particle.weight=this.weight;
		particle.radius = this.radius;
		particle.color = this.color;
		particle.charge = this.charge;
		return particle;
	}
}
function Space(width, height, maxKineticE, backgroundF) {
	this.maxKineticE=maxKineticE;
	this.backgroundF=function() {}
	this.particles=new Array();
	this.backgroudF=backgroundF;
	this.width = width;
	this.height = height;
	
	this.generateUniform=function(force, weight, count){
		this.particles=new Array();
		getRandomPosition=function(maxPosition, border) {
			return 1.5 * border + Math.random() * (maxPosition - 3 * border);
		}
		getRandomSpeed=function() {
			return (Math.random()-0.5)*2;
		}
		for (var i=0; i<count; i++) {
			position=new Vector(getRandomPosition(width, width * 1/100), getRandomPosition(height, height * 1/100));
			speed=new Vector(getRandomSpeed(), getRandomSpeed());
			if (speed.norm() != 0) {
				var randomKinetic = Math.random() * maxKineticE;
				var speedNorm = Math.sqrt(2 * randomKinetic / weight);
				speed=speed.multiply(speedNorm / speed.norm());
			}
			this.particles[i]=new Particle(position, speed, force, weight, "grey");
		}
	}
}
function Integrator(space) {
	this.space=space;
	var _this=this;
	var halt=false;
	this.integrate=function() {
		var movedParticles=new Array();
		for(var i=0; i<space.particles.length; i++) {
			var particle=space.particles[i];
			var force = space.backgroudF(particle.position);
			for(var j=0; j<space.particles.length; j++) {
				var otherParticle=space.particles[j];
				var relativePosition=otherParticle.position.minus(particle.position);
				force=force.plus(otherParticle.forceField(relativePosition).multiply(otherParticle.charge));
			}
			var position=force.multiply(particle.charge / particle.weight)
										.plus(particle.position)
										.plus(particle.speed);
			movedParticles[i]=particle.getMovedParticle(position);
			particle = null;
		}
		space.particles=movedParticles;
	}
	var start = null;
	var timeStep = 33;
	this.step = function() {};
	this.step=function(timestamp) {
		if (start === null) {
			start = timestamp;
		}
		var progress = timestamp - start;
		if (progress > timeStep) {
			start = timestamp;
			_this.integrate();
		}
		if (! _this.halt) {
			requestAnimationFrame(_this.step);
		}
	}
	this.start = function() {
		halt=false;
		requestAnimationFrame(this.step);
	}
	this.stop = function() {
		halt=true;
	}
}
function StatsDrawer(space) {
	var space=space;
	var _this=this;
	var histogramView = document.getElementById('histogramView');
	var ctx = histogramView.getContext('2d');
	var resize = 5; 
	var sumKinetic = 0;
	var colWidth = space.maxKineticE / 10;
	var histogram = new Array();
	var maxColumn=50;
	var particlesView = document.getElementById('particlesView');
	var halt = false;
	var drawFrameRate = function(progress) {
		var frameRate = 1000/progress;
		document.getElementById('frameRate').innerHTML=frameRate;
	}
	var drawHistogram = function(histogram) {
		var width = histogramView.width / maxColumn;
		ctx.fillStyle = 'red';
		for(var j=0; j<maxColumn; j++) {
			var colHeight = histogram[j]/space.particles.length * histogramView.height * resize;
			var x = j * width;
			var y = histogramView.height - colHeight;
			ctx.fillRect(x, y, width, colHeight);
		}
	}
	var theoryCount = function(column) {
			var meanKineticE = sumKinetic / space.particles.length;
			return Math.pow(Math.E, - column * colWidth / meanKineticE)
						- Math.pow(Math.E, - (column + 1) * colWidth / meanKineticE);
	}
	var drawTheory = function() {
		var width = histogramView.width / maxColumn;
		ctx.fillStyle = 'black';
		resize = 1 / theoryCount(0) * 0.8 ;
		for(var j=0; j<maxColumn; j++) {
			var colHeight = histogramView.height/100
			var x = j * width;
			var y = histogramView.height * (1 - theoryCount(j) * resize);
			ctx.fillRect(x, y, width, colHeight);
		}
	}
	var add = function(histogram, particle) {
		var kineticE = Math.pow(particle.speed.norm(), 2) * particle.weight / 2;
		sumKinetic = sumKinetic + kineticE;
		for(var j=0; j<maxColumn; j++) {
			if (kineticE < (j+1) * colWidth) {
				histogram[j] = histogram[j] + 1;
				break;
			}
		}
	}
	var clearHistogram = function(histogram) {
		for(var j=0; j<maxColumn; j++) {
			histogram[j]=0;
		}
	}
	var drawSpace = function(space) {
		var viewScale =1;
		var ctx = particlesView.getContext('2d');
		print=function(particle) {
			ctx.beginPath();
			var x = viewScale*particle.position.x;
			var y = viewScale*particle.position.y;
			ctx.strokeStyle = particle.color;
			ctx.fillStyle = particle.color;
			ctx.arc(x, y, particle.radius, 0, Math.PI * 2, false);
			ctx.closePath();
			ctx.stroke();
			ctx.fill();
		}
		// clear
		ctx.clearRect(0, 0, 1000, 1000);
		for(var j=0; j<space.particles.length; j++) {
			print(space.particles[j]);
		}
	}
	var start = null;
	var timeStep = 33;
	var step = function() {};
	this.step = function(timestamp) {
		if (start === null) {
			start = timestamp;
		}
		var progress = timestamp - start;
		if (progress > timeStep) {
			start = timestamp;
			// clear
			ctx.clearRect(0, 0, histogramView.width, histogramView.height);
			var colWidth = space.maxKineticE / 10;
			var histogram = new Array();
			var maxColumn=90;
			sumKinetic = 0;
			clearHistogram(histogram);
			for(var j=0; j<space.particles.length; j++) {
				add(histogram, space.particles[j]);
			}
			drawHistogram(histogram);
			drawTheory();
			drawSpace(space);
		}
		if (! _this.halt) {
			requestAnimationFrame(_this.step);
		}
	}
	this.start = function() {
		halt=false;
		requestAnimationFrame(this.step);
	}
	this.stop = function() {
		halt=true;
	}
}
function Restarter(timeout, toHalt, callback) {
	var _this = this;
	var halt = false;
	var start = null;
	var timeout = timeout;
	var timeStep = timeout;
	var setHalt = function(value) {
		halt = value;
		for(var j=0; j<toHalt.length; j++) {
			if(value) {
				toHalt[j].stop();
			} else {
				toHalt[j].start();
			}
		}
	}
	this.step = function(timestamp) {
		if (start === null) {
			start = timestamp;
		}
		var progress = timestamp - start;
		if (progress > timeStep) {
			start = timestamp;
			if (! halt) {
				setHalt(true);
				timeStep=500;
			} else {
				timeStep = timeout;
				setHalt(false);
				callback();
				return;
			}
		}
		requestAnimationFrame(_this.step);
	}
	this.start = function() {
		for(var j=0; j<toHalt.length; j++) {
				toHalt[j].start();
		}
		halt=false;
		requestAnimationFrame(this.step);
	}
	this.stop = function() {
		for(var j=0; j<toHalt.length; j++) {
				toHalt[j].stop();
		}
		halt=true;
	}
}
getBackgroundForce=function(width, height, borderScale) {
	var borderWidth = width * borderScale;
	var borderHeight = height * borderScale;
	return function(position) {
		constant=0.2;
		var x=0;
		var y=0;
		if(position.x<borderWidth) {
			x=(borderWidth-position.x)*constant;
		} else if(width - position.x<borderWidth) {
			x = -(borderWidth - width + position.x) * constant;
		}
		if(position.y<borderHeight) {
			y=(borderHeight-position.y)*constant;
		} else if(height - position.y<borderHeight) {
			y=-(borderHeight - height + position.y) * constant;
		}
		return new Vector(x, y);
	};
}
parabolical=function(vector) {
	var x=0;
	var y=0;
	var scale = 1000;
	x = - Math.pow(((vector.x-500)/scale), 3);
	y = - Math.pow(((vector.y-500)/scale), 3);
	return new Vector(x, y);
}
electroStatic=function(vector) {
	var constant=-9;
	var radius=vector.norm();
	var minRadius = 2;
	if (radius == 0) {
		return new Vector(0, 0);
	} else if (radius < minRadius) {
		var amplitude=constant / Math.pow(minRadius,3);
	} else {
		var amplitude=constant / Math.pow(radius,3);
	}
	return vector.multiply(amplitude);
}
getSoftBallForce = function(radiusRange) {
	softBall = function(vector) {
		var constant=-Math.pow(2,-28);
		var radius=vector.norm();
		if ((!(isNaN(radius))) && radius < radiusRange && radius != 0) {
			var amplitude = constant * (radiusRange - radius);
			return vector.multiply(amplitude);
		}
		return new Vector(0, 0);
	}
	return softBall;
}
restart = function() {
	// create space with particles
	var count = 100;
	var force = electroStatic;
	space.generateUniform(force, 1, count);
	// brownian particle
	var position = new Vector(width * 1/4, height * 2/5);
	var speed = new Vector(0, 0);
	var weight = 20;
	var force = electroStatic;
	var particle = new Particle(position, speed, force, weight);
	particle.radius=10;
	particle.color="red";
	space.particles[space.particles.length]=particle;
	// green starting position of brownian particle
	particle = new Particle(position, new Vector(0, 0), function(vector) {return new Vector(0, 0);}, 1);
	particle.radius=10;
	particle.color="green";
	particle.charge=0;
	space.particles[0]=particle;
	restarter = new Restarter(20000, [ integrator, statsDrawer ], window.restart);
	restarter.start();
}
init = function() {
	var maxKinetic = 40;
	var particlesView = document.getElementById('particlesView');
	width = particlesView.width; 
	height = particlesView.height; 
	space = new Space(width, height, maxKinetic, getBackgroundForce(width, height, 1/100));
	integrator = new Integrator(space);
	statsDrawer = new StatsDrawer(space);
	restart();
}
window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
