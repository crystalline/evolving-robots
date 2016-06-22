// Drawing functions

var pr = console.log;
var fs = require('fs');
var font = {bits: new Uint32Array(JSON.parse(fs.readFileSync('font_bits.json'))),
            charWidth: 8, charHeight: 16, width: 32, height: 8, codeRange: [0,255]};

var draw = {};
draw.debug = true;

function clipRect(W,H,px,py) {
    return (px >= 0 && px < W) && (py >= 0 && py < H);
}

function cross(x1,y1,x2,y2,p1,p2) {
    return (p1-x1)*(y2-y1)-(p2-y1)*(x2-x1);
}

function getFontBit(i) {
    var word = i >> 5;
    var bit = i - (word << 5);
    return font.bits[word] >> i & 1;
}

draw.text = function(imageData, imageDataWidth, imageDataHeight,
                     str, x, y,
                     r, g, b, a,
                     br, bg, bb, ba) {
    for (var i=0; i<str.length; i++) {
        var code = str.charCodeAt(i);
        if (code < 0 || code > 255) code = 168;
        draw.char(imageData, imageDataWidth, imageDataHeight,
                  code, x+i*8, y,
                  r, g, b, a,
                  br, bg, bb, ba);
    }
}

draw.char = function(imageData, imageDataWidth, imageDataHeight,
                     asciiCode, x, y,
                     r, g, b, a,
                     br, bg, bb, ba) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    // Decide if need to paint background color
    var drawBG = (br || bg || bb);
    if (drawBG) {
        br = br || 0;
        bg = bg || 0;
        bb = bb || 0;
        ba = ba || 255;
    }
    //Clip against screen boundary
    if (x <= -font.charWidth || x >= imageDataWidth || y <= -font.charHeight || i >= imageDataHeight) {
        pr('draw.char: clipped char, x='+x+' y='+y);
        return;
    }
    // If given a string, extract first character code
    if (typeof asciiCode === 'string' && asciiCode.length) asciiCode = asciiCode.charCodeAt(0);
    // Else assume we were given a number code
    if (asciiCode >= font.codeRange[0] && asciiCode <= font.codeRange[1]) {
        var charY = Math.floor(asciiCode/font.width);
        var charX = asciiCode - charY*font.width;
        
        var offsetX = charX * font.charWidth;
        var offsetY = charY * font.charHeight;
        
        var x_min = Math.min(Math.max(0, Math.round(x)), imageDataWidth);
        var x_max = Math.min(Math.max(0, Math.round(x)+font.charWidth), imageDataWidth);
        var y_min = Math.min(Math.max(0, Math.round(y)), imageDataHeight);
        var y_max = Math.min(Math.max(0, Math.round(y)+font.charHeight), imageDataHeight);
        
        var _i=0,_j=0;
        var lineWidth = font.width*font.charWidth;
        for (var i = y_min; i < y_max; i++) {
            _j=0;
            var fontOffset = lineWidth*(_i+offsetY)+offsetX;
            for (var j = x_min; j < x_max; j++) {
                var fontPixel = getFontBit(fontOffset+_j);
                if (fontPixel) {
                    var imageOffset = (i*imageDataWidth+j)<<2;
                    imageData[imageOffset] = r;
                    imageData[imageOffset+1] = g;
                    imageData[imageOffset+2] = b;
                    imageData[imageOffset+3] = a;
                } else if (drawBG) {
                    var imageOffset = (i*imageDataWidth+j)<<2;
                    imageData[imageOffset] = br;
                    imageData[imageOffset+1] = bg;
                    imageData[imageOffset+2] = bb;
                    imageData[imageOffset+3] = ba;
                }
                _j++;
            }
            _i++;
        }
    } else {
        if (draw.debug) { pr('draw.char: invalid char code',asciiCode,'ensure that you call it only with valid codes from',font.codeRange) }
    }
}

draw.rect = function(imageData, imageDataWidth, imageDataHeight,
                     x, y, w, h,
                     r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    //pr('draw.rect:',{x:x,y:y,w:w,h:h});
    var x0 = Math.round(Math.max(0, x));
    var y0 = Math.round(Math.max(0, y));
    var x1 = Math.round(Math.min(imageDataWidth, x+w));
    var y1 = Math.round(Math.min(imageDataHeight, y+h));
    
    for (var i=y0; i<y1; i++) {
        for (var j=x0; j<x1; j++) {
            var offset = ((i*imageDataWidth)+j)<<2;
            imageData[offset]   = r;
            imageData[offset+1] = g;
            imageData[offset+2] = b;
            imageData[offset+3] = 255;
        }
    }
}

draw.fill = function(imageData, imageDataWidth, imageDataHeight,
                     r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    var N = imageDataWidth*imageDataHeight<<2;
    for (var i=0; i<N; i+=4) {
        imageData[i] = r;
        imageData[i+1] = g;
        imageData[i+2] = b;
        imageData[i+3] = a;
    }
};

draw.triangle = function(imageData, imageDataWidth, imageDataHeight,
                         x1, y1, x2, y2, x3, y3,
                         r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 200;
    var x1 = Math.round(x1),
        y1 = Math.round(y1),
        x2 = Math.round(x2),
        y2 = Math.round(y2),
        x3 = Math.round(x3),
        y3 = Math.round(y3),
        x_min = Math.min(x1,x2,x3),
        x_max = Math.max(x1,x2,x3),
        y_min = Math.min(y1,y2,y3),
        y_max = Math.max(y1,y2,y3);
        
    x_min = Math.max(0,x_min);
    y_min = Math.max(0,y_min);
    x_max = Math.min(imageDataWidth-1,x_max);
    y_max = Math.min(imageDataHeight-1,y_max);
    
    middle_cross = cross(x1,y1,x3,y3,x2,y2);
    
    if(middle_cross < 0) {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 >= 0) && (cross2 >= 0) && (cross3 >= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
                 }
            }
        }
    } else {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 <= 0) && (cross2 <= 0) && (cross3 <= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
                 }
            }
        }
    }
    var drawOutline = false;
    if (drawOutline) {
        draw.line(imageData,imageDataWidth,imageDataHeight,x1,y1,x2,y2,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x2,y2,x3,y3,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x3,y3,x1,y1,200,0,200,255);
    }
}

function alphaBlend(ColA, AlphaA, ColB, AlphaB) {
    return (ColA*AlphaA+ColB*AlphaB*(1-AlphaA))/(AlphaA+AlphaB*(1-AlphaA));
}

draw.triangleAlpha = function(imageData, imageDataWidth, imageDataHeight,
                         x1, y1, x2, y2, x3, y3,
                         r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    var x1 = Math.round(x1),
        y1 = Math.round(y1),
        x2 = Math.round(x2),
        y2 = Math.round(y2),
        x3 = Math.round(x3),
        y3 = Math.round(y3),
        x_min = Math.min(x1,x2,x3),
        x_max = Math.max(x1,x2,x3),
        y_min = Math.min(y1,y2,y3),
        y_max = Math.max(y1,y2,y3);
        
    x_min = Math.max(0,x_min);
    y_min = Math.max(0,y_min);
    x_max = Math.min(imageDataWidth-1,x_max);
    y_max = Math.min(imageDataHeight-1,y_max);
    
    middle_cross = cross(x1,y1,x3,y3,x2,y2);
    
    var div = 1/255;
    
    if(middle_cross < 0) {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 >= 0) && (cross2 >= 0) && (cross3 >= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    var alpha = imageData[offset+3];
                    imageData[offset]   = alphaBlend(r, a, imageData[offset], alpha);
                    imageData[offset+1] = alphaBlend(g, a, imageData[offset+1], alpha);
                    imageData[offset+2] = alphaBlend(b, a, imageData[offset+2], alpha);
                    imageData[offset+3] = a+alpha*(1-a);
                 }
            }
        }
    } else {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 <= 0) && (cross2 <= 0) && (cross3 <= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] += (255-imageData[offset])*(r*div);
                    var alpha = imageData[offset+3];
                    imageData[offset]   = alphaBlend(r, a, imageData[offset], alpha);
                    imageData[offset+1] = alphaBlend(g, a, imageData[offset+1], alpha);
                    imageData[offset+2] = alphaBlend(b, a, imageData[offset+2], alpha);
                    imageData[offset+3] = a+alpha*(1-a);
                 }
            }
        }
    }
    var drawOutline = false;
    if (drawOutline) {
        draw.line(imageData,imageDataWidth,imageDataHeight,x1,y1,x2,y2,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x2,y2,x3,y3,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x3,y3,x1,y1,200,0,200,255);
    }
}

draw.triangleAdd = function(imageData, imageDataWidth, imageDataHeight,
                         x1, y1, x2, y2, x3, y3,
                         r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    var x1 = Math.round(x1),
        y1 = Math.round(y1),
        x2 = Math.round(x2),
        y2 = Math.round(y2),
        x3 = Math.round(x3),
        y3 = Math.round(y3),
        x_min = Math.min(x1,x2,x3),
        x_max = Math.max(x1,x2,x3),
        y_min = Math.min(y1,y2,y3),
        y_max = Math.max(y1,y2,y3);
        
    x_min = Math.max(0,x_min);
    y_min = Math.max(0,y_min);
    x_max = Math.min(imageDataWidth-1,x_max);
    y_max = Math.min(imageDataHeight-1,y_max);
    
    middle_cross = cross(x1,y1,x3,y3,x2,y2);
    
    var div = 1/255;
    
    if(middle_cross < 0) {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 >= 0) && (cross2 >= 0) && (cross3 >= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] += (255-imageData[offset])*(r*div);
                    imageData[offset+1] += (255-imageData[offset+1])*(g*div);
                    imageData[offset+2] += (255-imageData[offset+2])*(b*div);
                    imageData[offset+3] = a;
                 }
            }
        }
    } else {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 <= 0) && (cross2 <= 0) && (cross3 <= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] += (255-imageData[offset])*(r*div);
                    imageData[offset+1] += (255-imageData[offset+1])*(g*div);
                    imageData[offset+2] += (255-imageData[offset+2])*(b*div);
                    imageData[offset+3] = a;
                 }
            }
        }
    }
    var drawOutline = false;
    if (drawOutline) {
        draw.line(imageData,imageDataWidth,imageDataHeight,x1,y1,x2,y2,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x2,y2,x3,y3,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x3,y3,x1,y1,200,0,200,255);
    }
}

draw.triangleMul = function(imageData, imageDataWidth, imageDataHeight,
                         x1, y1, x2, y2, x3, y3,
                         r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    var x1 = Math.round(x1),
        y1 = Math.round(y1),
        x2 = Math.round(x2),
        y2 = Math.round(y2),
        x3 = Math.round(x3),
        y3 = Math.round(y3),
        x_min = Math.min(x1,x2,x3),
        x_max = Math.max(x1,x2,x3),
        y_min = Math.min(y1,y2,y3),
        y_max = Math.max(y1,y2,y3);
        
    x_min = Math.max(0,x_min);
    y_min = Math.max(0,y_min);
    x_max = Math.min(imageDataWidth-1,x_max);
    y_max = Math.min(imageDataHeight-1,y_max);
    
    middle_cross = cross(x1,y1,x3,y3,x2,y2);
    
    if(middle_cross < 0) {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 >= 0) && (cross2 >= 0) && (cross3 >= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] = Math.max(255, imageData[offset] * (1+(r/255)));
                    imageData[offset+1] = Math.max(255, imageData[offset] * (1+(g/255)));
                    imageData[offset+2] = Math.max(255, imageData[offset] * (1+(b/255)));
                    imageData[offset+3] = a;
                 }
            }
        }
    } else {
        for(var x = x_min; x <= x_max; x++) {
            for(var y = y_min; y <= y_max; y++) {
                var cross1 = cross(x1,y1,x2,y2,x,y),
                    cross2 = cross(x2,y2,x3,y3,x,y),
                    cross3 = cross(x3,y3,x1,y1,x,y);
                 if((cross1 <= 0) && (cross2 <= 0) && (cross3 <= 0)) {
                    var offset = ((y*imageDataWidth)+x)<<2;
                    imageData[offset] = Math.max(255, imageData[offset] * (1+(r/255)));
                    imageData[offset+1] = Math.max(255, imageData[offset] * (1+(g/255)));
                    imageData[offset+2] = Math.max(255, imageData[offset] * (1+(b/255)));
                    imageData[offset+3] = a;
                 }
            }
        }
    }
    var drawOutline = false;
    if (drawOutline) {
        draw.line(imageData,imageDataWidth,imageDataHeight,x1,y1,x2,y2,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x2,y2,x3,y3,200,0,200,255);
        draw.line(imageData,imageDataWidth,imageDataHeight,x3,y3,x1,y1,200,0,200,255);
    }
}

draw.line = function(imageData, imageDataWidth, imageDataHeight,
                     x1, y1, x2, y2,
                     r, g, b, a) {
    r = r || 0;
    g = g || 0;
    b = b || 0;
    a = a || 255;
    var x1 = Math.min(imageDataWidth-1, Math.max(0, Math.round(x1))),
        y1 = Math.min(imageDataHeight-1, Math.max(0, Math.round(y1))),
        x2 = Math.min(imageDataWidth-1, Math.max(0, Math.round(x2))),
        y2 = Math.min(imageDataHeight-1, Math.max(0, Math.round(y2))),
        dx = x2 - x1,
        dy = y2 - y1,
        k = dy/dx,
        ik = dx/dy;
    
    if (Math.abs(dx) >= Math.abs(dy)) {
        var x = 0;
        var bias = y1-k*x1;
        
        if(x2 > x1) {
            for(x = x1; x <= x2; x++) {
                var y = Math.round(k*x+bias);
                var offset = ((y*imageDataWidth)+x)<<2;
                imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
            }
        } else {
            for(x = x2; x <= x1; x++) {
                var y = Math.round(k*x+bias);
                var offset = ((y*imageDataWidth)+x)<<2;
                imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
            }
        }
    } else {
        var y = 0;
        var bias = x1-ik*y1;
        
        if(y2 > y1) {
            for(y = y1; y <= y2; y++) {
                var x = Math.round(ik*y+bias);
                var offset = ((y*imageDataWidth)+x)<<2;
                imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
            }
        } else {
            for(y = y2; y <= y1; y++) {
                var x = Math.round(ik*y+bias);
                var offset = ((y*imageDataWidth)+x)<<2;
                imageData[offset] = r; imageData[offset+1] = g; imageData[offset+2] = b; imageData[offset+3] = a;
            }
        }
    }
}


try {
    if (global) {
        module.exports = draw;
    }
} catch (e) {}
