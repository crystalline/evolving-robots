
var util = require('./util.js');

function L2square(x1,y1,x2,y2) {
    var dx = x1-x2;
    var dy = y1-y2;
    return dx*dx+dy*dy
}

function L2distance(x1,y1,x2,y2) {
    return Math.sqrt(L2square(x1,y1,x2,y2));
}

Index2d.prototype.get = function (cx, cy) {
    if (this.cells[cx] && this.cells[cx][cy]) {
        return this.cells[cx][cy];
    } else {
        return [];
    }
};

Index2d.prototype.addBall = function(ball) {
    var x = ball.x;
    var y = ball.y;
    var cx = Math.floor(x * this.k);
    var cy = Math.floor(y * this.k);
    if (!this.cells[cx]) { this.cells[cx] = {} };
    if (!this.cells[cx][cy]) { this.cells[cx][cy] = [] };
    this.cells[cx][cy].push(ball);
};

Index2d.prototype.mapBallsInRadius = function (x, y, radius, fn) {
    var cx = Math.floor(x * this.k);
    var cy = Math.floor(y * this.k);
    var cr = Math.ceil(radius * this.k);
    var result = [];
    var i,j,k;
    var balls;
    for (i=-cr; i<=cr; i++) {
        for (j=-cr; j<=cr; j++) {
            balls = this.get(cx+i, cy+j);
            for (k=0; k<balls.length; k++) {
                fn(balls[k]);
            }
        }
    }
    return result;
};

Index2d.prototype.getBalls = function (x, y, radius) {
    var balls = [];
    this.mapBallsInRadius(x,y,radius, function (b) { balls.push(b) });
    return balls;
}

Index2d.prototype.getBallStat = function() {
    
};

function Index2d(cellSide) {
    this.side = cellSide;
    this.k = 1/this.side;
    this.cells = {};
    return this;
}

function test2dIndex() {
    
    var random = Math.random;
    
    /* Comparison to C++ version    
    int N = 10000000;
    real L = 6.0;
    int w = 500;
    int h = 500;
    real side = 1.1;
    */
    
    /*
    var N = 150;
    var L = 1.5;
    var w = 1000;
    var h = 1000;
    var side = 1.1;
    */

    var N = 10000000;
    var L = 6.0;
    var w = 500;
    var h = 500;
    var side = 1.1;
    
    var balls = [];
    var i,j;
    
    var index = new Index2d(side);

    var t0 = Date.now();
    
    for (i=0; i<N; i++) {
        var ball = {x: random()*w, y: random()*h};
        balls.push(ball);
        index.addBall(ball);
    }
    
    var x = random()*w;
    var y = random()*h;
    
    console.log('x = '+x);
    console.log('y = '+y);
    
    var t1 = Date.now();
    
    var ballsTest = [];
    
    console.log(balls.length);
    
    for (j=0; j<balls.length; j++) {
        var ball = balls[j];
        if (L2square(x, y, ball.x, ball.y) < L*L) {
            ballsTest.push(ball);
        }
    }
    
    var t2 = Date.now();
    
    var ballsIndex = index.getBalls(x, y, L);
    var result = [];
    
    console.log(ballsIndex.length);
    
    for (j=0; j<ballsIndex.length; j++) {
        var ball = ballsIndex[j];
        if (L2square(x, y, ball.x, ball.y) < L*L) {
            result.push(ball);
        }
    }
    
    var t3 = Date.now();
    
    var order = function(a,b) { if (a.x > b.x) { return 1 } else { return -1 } };
    result.sort(order);
    ballsTest.sort(order);
            
    var fail = false;
    
    if (result.length != ballsTest.length) { console.log('Index test failed: length difference'); fail = true; return };
    
    for (i=0; i<Math.max(result.length, ballsTest.length); i++) {
        if (result[i].x != ballsTest[i].x || result[i].y != ballsTest[i].y) {
            console.log('Index test failed at '+i); fail = true;
        }
    }
    
    if (!fail) {
        console.log('Index2d tests passed, time');
        console.log('Reference:',(t2-t1),'msec');
        console.log('Indexed:',(t3-t2),'msec');
        console.log('Total Time:',(t3-t0),'msec');
        console.log('Speedup',(t2-t1)/(t3-t2),'times');
    } else {
        console.log('Index2d tests FAILED\n');
    }
}

//Calculate intersection for ball and ray using trigonometry and vectors
function rayCircleIntersect(rx, ry, rangle, rlen, mindist, cx, cy, cr) {
    var rayx = Math.cos(rangle);
    var rayy = Math.sin(rangle);
    var prayx = rayx*rlen;
    var prayy = rayy*rlen;
    var rcx = cx-rx;
    var rcy = cy-ry;
    var rcoord = rayx*rcx + rayy*rcy;
    var projx = rayx*rcoord;
    var projy = rayy*rcoord;
    var tangentLen = L2distance(projx, projy, rcx, rcy);
    if (rcoord > 0 && rcoord < rlen+cr && tangentLen < cr) {
        var L = (tangentLen/cr);
        var touchL = cr*Math.sqrt(1-L*L);
        var touchDist = rcoord - touchL;
        if (touchDist > mindist && touchDist < rlen) {
            return { distance: touchDist, x: rx+touchDist*rayx, y: ry+touchDist*rayy };
        }
    }
}

RobotWorldModel.prototype.step = function(speeds, dt) {
    
    var sin = Math.sin,
        cos = Math.cos,
        r = this.r;
    
    if (speeds && speeds.length >= 2) {
        this.Vleft = speeds[0];
        this.Vright = speeds[1];
    } else {
        this.Vleft = 0;
        this.Vright = 0;
    }
    
    var V = (this.Vleft + this.Vright)/2;
    var Phi = (this.Vright - this.Vleft)/2;
    
    var Vx = V*cos(this.alpha);
    var Vy = V*sin(this.alpha);
    
    this.x += Vx * dt;
    this.y += Vy * dt;
    this.alpha += Phi * dt;
    
    if (this.x > 10) this.x = 0;
    if (this.x < 0) this.x = 10;
    if (this.y > 10) this.y = 0;
    if (this.y < 0) this.y = 10;
    
    this.onBall = false;
    
    //Broad phase ray-ball collision detection
    var i,j;
    var candidateBalls = [];
    var R = (this.L+this.br);
    var R2 = R*R;
    var criticalR2 = (this.r+this.br)*(this.r+this.br);
    var x = this.x, y = this.y;
    var alpha = this.alpha;
    
    var robot = this;
    
    function testBall(ball) {
        var dist2 = L2square(x, y, ball.x, ball.y);
        if (dist2 < R2) {
            candidateBalls.push(ball);
            if (dist2 < criticalR2) {
                robot.onBall = true;
            }
        }
        ball.active = false;
    }
    
    this.index.mapBallsInRadius(x, y, R, testBall);
    
    /*
    for (i=0; i<this.balls.length; i++) {
        var ball = this.balls[i];
        testBall(ball);
    }
    */
    
    //Clear status flags from previous step
    for (i=0; i<this.rays.length; i++) {
        this.rays[i].shortened = false;
        this.vision[i] = 0; 
    }
    
    var intersections = []; //Array of unfiltered intersection
    var indexedByRay = {}; //Cache of intersections for each ray with shortest distance
    for (i=0; i<candidateBalls.length; i++) {
        var ball = candidateBalls[i];
        for (j=0; j<this.rays.length; j++) {
            var ray = this.rays[j];
            //Narrow phase ball-ray intersection, returns undefined if no contact
            var coords = rayCircleIntersect(
                this.x, this.y, this.alpha+ray.angle, this.L,
                this.r, ball.x, ball.y, this.br
            );
            if (coords) {
                //Only look at intersections for unused rays or shorter intersections
                if (!indexedByRay[j] || indexedByRay[j].distance > coords.distance) {
                    coords.ball = ball;
                    intersections.push(coords);
                    //Ray status for drawing
                    ray.shortened = coords.distance;
                    this.vision[j] = coords.distance;
                    if (indexedByRay[j]) {
                        indexedByRay[j].remove = true;
                    }
                    indexedByRay[j] = coords;
                }
            }
        }
    }
    
    //Copy true (shortest) intersections to official list
    this.intersections = [];
    for (i=0; i<intersections.length; i++) {
        if (!intersections[i].remove) this.intersections.push(intersections[i]);
    }
    
    //Highlight detected balls
    for (i=0; i<this.intersections.length; i++) {
        this.intersections[i].ball.active = true;
    }
};
    
RobotWorldModel.prototype.draw = function(graphics) {
    
    var i;
    var lineWidth = this.r/10;
    
    for (i=0; i<this.balls.length; i++) {
        var ball = this.balls[i]
        var color = ball.active ? '#FF11CC' : '#1111CC';
        graphics.drawCircle(ball.x, ball.y, this.br, false, color);
    }
    
    for (i=0; i<this.rays.length; i++) {
        var ray = this.rays[i];
        var phi = ray.angle + this.alpha;
        var lx = Math.cos(phi);
        var ly = Math.sin(phi);
        var len = ray.shortened ? ray.shortened : this.L;
        graphics.drawLine(this.x, this.y,
            this.x+len*lx, this.y+len*ly, 0.05, '#00AA00');
        
        if (ray.shortened) {
            graphics.drawRect(0.02+i*0.22, 0.1, 0.2, 1*(ray.shortened/this.L), '#00AA00');
        }
    }
    
    for (i=0; i<this.intersections.length; i++) {
        var ins = this.intersections[i];
        graphics.drawCircle(ins.x, ins.y, this.br*0.5, false, '#00FFAA');
    }
    
    var robotCol = '#CC44AA';
    if (this.onBall) { robotCol = 'yellow' }
    graphics.drawCircle(this.x, this.y, this.r, false, robotCol);
    
    graphics.drawCircle(this.x, this.y, this.r, lineWidth);
    
    var kx = Math.cos(this.alpha);
    var ky = Math.sin(this.alpha);
    var r = this.r;
    
    graphics.drawLine(this.x, this.y,
        this.x + r * kx,
        this.y + r * ky, lineWidth);
    
    graphics.drawLine(this.x, this.y,
        this.x + r * Math.cos(this.alpha+Math.PI*2/3),
        this.y + r * Math.sin(this.alpha+Math.PI*2/3), lineWidth);
        
    graphics.drawLine(this.x, this.y,
        this.x + r * Math.cos(this.alpha+Math.PI*4/3),
        this.y + r * Math.sin(this.alpha+Math.PI*4/3), lineWidth);
    
    var klx = Math.cos(this.alpha+0.5*Math.PI);
    var kly = Math.sin(this.alpha+0.5*Math.PI);
    var krx = Math.cos(this.alpha-0.5*Math.PI);
    var kry = Math.sin(this.alpha-0.5*Math.PI);
    
    if (this.Vleft) graphics.drawLine(
      (this.x)+klx*r,
      (this.y)+kly*r,
      (this.x)+klx*r+this.Vleft*kx,
      (this.y)+kly*r+this.Vleft*ky, lineWidth*2, '#FF1100');
    
    if (this.Vright) graphics.drawLine(
      (this.x)+krx*r,
      (this.y)+kry*r,
      (this.x)+krx*r+this.Vright*kx,
      (this.y)+kry*r+this.Vright*ky, lineWidth*2, '#FF1100');
};

RobotWorldModel.prototype.getIOspec = function() {
    return {type: 'float32', in: this.nrays, out: 2};
}

function RobotWorldModel(conf) {
    conf = conf || {};
    
    this.random = conf.random || Math.random;
    
    this.r = 0.1;
    
    this.x = conf.x || 5;
    this.y = conf.y || 5;
    this.alpha = conf.alpha || 0;
    
    this.Vright = 0;
    this.Vleft = 0;
    
    this.beta = conf.beta || Math.PI/2;
    this.L = conf.L || this.r*10;
    this.nrays = conf.nrays || 9;
    this.rays = [];
    
    this.vision = new Array(this.nrays);
    
    var i;
    for (i=0; i<this.nrays; i++) {
        var angle = (-this.beta/2)+i*this.beta/(this.nrays-1);
        this.rays.push({angle: angle});
        this.vision[i] = 0;
    }
    
    this.nballs = conf.nballs || 200;
    this.balls = [];
    this.br = conf.br ||0.1;
    this.minBdist = this.r*2+this.br*2;
    this.minDistOvrdProb = 0.1;
    
    this.w = conf.w || 10;
    this.h = conf.h || 10;
    
    this.intersections = [];  
    this.index = new Index2d(this.L*1.1);
    
    //Generate ball with condition that no ball should be closer than this.minBdist to any other ball
    //(probability of ignoring this condition is minDistOvrdProb)
    var ballCount = 0;
    while (ballCount < this.nballs) {
        var bx = this.random()*this.w;
        var by = this.random()*this.h;
        
        /*
        if (bx != bx || by != by) {
            console.log('err'+bx);
        }
        */
        
        var acceptBall = true;
        var sqrMinDist = this.minBdist*this.minBdist;
        for (i=0; i<this.balls.length; i++) {
            var ball = this.balls[i];
            if ((ball.x-bx)*(ball.x-bx)+(ball.y-by)*(ball.y-by) < sqrMinDist) {
                if (this.random() > this.minDistOvrdProb) {
                    acceptBall = false;
                    break;                    
                }
            }
        }
        
        if (acceptBall) {
            var ball = {
                x: bx,
                y: by
            };
            this.balls.push(ball);
            this.index.addBall(ball);
            ballCount++;
        }
        
        /*
        var distacc = 0;
        for (i=0; i<this.balls.length; i++) {
            for (j=0; j<this.balls.length; j++) {
                distacc += L2distance(this.balls[i].x, this.balls[i].y, this.balls[j].x, this.balls[j].y);
            }
        }
        console.log('avg ball dist: '+Math.sqrt(distacc));
        */
    }
    
    return this;
}

function testRobotSimPerf(random) {
    var random = random || Math.random;
    
    var N = 100000;
    var genome = [];
    var i;
    var model = new RobotWorldModel();
    var speed = [2,2];
    
    var simSteps = 2500;
    var simDT = 1/50;
    
    console.log('Sim performance test');
    console.log('N='+N);
    
    var t1 = Date.now();
    
    for (i=0; i<N; i++) {
        if (i % 50) { speed[0] = random()*2; speed[1] = random()*2 }
        model.step(speed, simDT);
    }
    
    console.log(model.x);
    console.log(model.y);
    
    var t2 = Date.now();
    
    console.log('Done. Time: '+((t2-t1)/1000)+'s, Time per step: '+((t2-t1)/(N*1000)));    
}

module.exports = {
    test: testRobotSimPerf,
    RobotWorldModel: RobotWorldModel,
    Index2d: Index2d
}

if (require.main === module) {
    test2dIndex();
    testRobotSimPerf();
}




































