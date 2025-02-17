var media = ["audio/collab.wav"],
    fftSize = 1024,
    // [32, 64, 128, 256, 512, 1024, 2048]

    background_color = "rgba(0, 0, 1, 1)",
    background_gradient_color_1 = "#000011",
    background_gradient_color_2 = "#060D1F",
    background_gradient_color_3 = "#02243F",

    stars_color = "#465677",
    stars_color_2 = "#B5BFD4",
    stars_color_special = "#F451BA",
    TOTAL_STARS = 2000,
    STARS_BREAK_POINT = 140,
    stars = [],
    medStars = [],
    bigStars = [],

    waveform_color = "rgba(29, 36, 57, 0.05)",
    waveform_color_2 = "rgba(0,0,0,0)",
    waveform_line_color = "rgba(157, 242, 157, 0.11)",
    waveform_line_color_2 = "rgba(157, 242, 157, 1)",
    waveform_tick = 0.05,
    TOTAL_POINTS = fftSize / 2,
    points = [],

    randomColor = "rgba(0,0,0,1)",

    bubble_avg_color = "rgba(29, 36, 120, 0.1)",
    bubble_avg_color_2 = "rgba(29, 36, 57, 0.05)",
    bubble_avg_color_3 = "rgba(255, 0, 90, .07)",
    bubble_avg_line_color = "rgba(100, 218, 0, 1)",
    bubble_avg_line_color_2 = "rgba(100, 218, 0, 1)",
    bubble_avg_line_color_3 = "rgba(255, 0, 90, 1)",
    bubble_avg_tick = 0.001,
    TOTAL_AVG_POINTS = 64,
    AVG_BREAK_POINT = 100,
    avg_points = [],
    bigAvg_points = [],

    SHOW_STAR_FIELD = true,
    SHOW_WAVEFORM = true,
    SHOW_AVERAGE = true,

    AudioContext = (window.AudioContext || window.webkitAudioContext),
    floor = Math.floor,
    round = Math.round,
    random = Math.random,
    sin = Math.sin,
    cos = Math.cos,
    PI = Math.PI,
    PI_TWO = PI * 2,
    PI_HALF = PI / 180,

    w = 0,
    h = 0,
    cx = 0,
    cy = 0,

    playing = false,
    startedAt, pausedAt,

    rotation = 0,
    msgElement = document.querySelector('#loading .msg'),
    avg, ctx, actx, asource, gainNode, analyser, frequencyData, frequencyDataLength, timeData;


window.addEventListener('load', initialize, false);
window.addEventListener('resize', resizeHandler, false);



function mouseClicked() {
  randomColor = "rgba("+ random(0,255) + ',' + random(0,255) + ',' + random(0,255) + ",1)";
};

function initialize() {
    if (!AudioContext) {
        return featureNotSupported();
    }

    ctx = document.createElement('canvas').getContext('2d');
    actx = new AudioContext();

    document.body.appendChild(ctx.canvas);

    resizeHandler();
    initializeAudio();
}

function featureNotSupported() {
    hideLoader();
    return document.getElementById('no-audio').style.display = "block";
}

function hideLoader() {
    return document.getElementById('loading').className = "hide";
}

function updateLoadingMessage(text) {
    msgElement.textContent = text;
}

function initializeAudio() {
    var xmlHTTP = new XMLHttpRequest();

    updateLoadingMessage("- Loading Audio Buffer -");

    xmlHTTP.open('GET', media[0], true);
    xmlHTTP.responseType = "arraybuffer";

    xmlHTTP.onload = function(e) {
        updateLoadingMessage("- Decoding Audio File Data -");
        analyser = actx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.minDecibels = -100;
        analyser.maxDecibels = -30;
        analyser.smoothingTimeConstant = 0.8;

        actx.decodeAudioData(this.response, function(buffer) {
            console.timeEnd('decoding audio data');

            msgElement.textContent = "- Ready -";

            audio_buffer = buffer;
            gainNode = actx.createGain();

            gainNode.connect(analyser);
            analyser.connect(actx.destination);

            frequencyDataLength = analyser.frequencyBinCount;
            frequencyData = new Uint8Array(frequencyDataLength);
            timeData = new Uint8Array(frequencyDataLength);

            createStarField();
            createMedStarField();
            createBigStarField();
            createPoints();
            createAudioControls();
        }, function(e) { alert("Error decoding audio data" + e.err); });
    };

    xmlHTTP.send();
}

function createAudioControls() {
    var playButton = document.createElement('a');

    playButton.setAttribute('id', 'playcontrol');
    playButton.textContent = "pause";
    document.body.appendChild(playButton);

    playButton.addEventListener('click', function(e) {
        e.preventDefault();
        this.textContent = playing ? "play" : "pause";
        toggleAudio();
    });

    playAudio();
    hideLoader();
}

function toggleAudio(){
    playing ? pauseAudio() : playAudio();
}

function playAudio() {
    playing = true;
    startedAt = pausedAt ? Date.now() - pausedAt : Date.now();
    asource = null;
    asource = actx.createBufferSource();
    asource.buffer = audio_buffer;
    asource.loop = true;
    asource.connect(gainNode);
    pausedAt ? asource.start(0, pausedAt / 1000) : asource.start();


    animate();

    drawBurst();
    drawLargeCircle();
    drawSmallCircle();


}

function pauseAudio() {
    playing = false;
    pausedAt = Date.now() - startedAt;
    asource.stop();
}

function getAvg(values) {
    var value = 0;

    values.forEach(function(v) {
        value += v;
    })

    return value / values.length;
}

function clearCanvas() {
    var gradient = ctx.createLinearGradient(0, 0, 0, h);

    gradient.addColorStop(0, background_gradient_color_1);
    gradient.addColorStop(0.5, background_gradient_color_2);
    gradient.addColorStop(1, background_gradient_color_3);

    ctx.beginPath();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.fill();
    ctx.closePath();

    gradient = null;
}

function drawStarField() {
    var i, len, p, tick;

    for (i = 0, len = stars.length; i < len; i++) {
        p = stars[i];
        tick = (avg > AVG_BREAK_POINT) ? (avg/20) : (avg/50);
        p.y += p.dy * tick * 2 ;
        p.x += p.dx * tick * 2 ;
        p.z += p.dz;

        p.dx += p.ddx;
        p.dy += p.ddy;
        p.radius = .2 + ((p.max_depth - p.z) * .1);

        if (p.x < -cx || p.x > cx || p.y < -cy || p.y > cy) {
            stars[i] = new Star();
            continue;
        }

        ctx.beginPath();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = p.color;
        ctx.arc(p.x + cx, p.y + cy, p.radius, PI_TWO, false);
        ctx.fill();
        ctx.closePath();
    }

    i = len = p = tick = null;
}

function drawMedStarField() {
    var i, len, p, tick;

    for (i = 0, len = medStars.length; i < len; i++) {
        p = medStars[i];
        tick = (avg > AVG_BREAK_POINT) ? (avg/20) : (avg/50);
        p.y += p.dy * tick * 4;
        p.x += p.dx * tick * 4;
        p.z += p.dz;

        p.dx += p.ddx;
        p.dy += p.ddy;
        p.radius = .2 + ((p.max_depth - p.z) * .7);

        if (p.x < -cx || p.x > cx || p.y < -cy || p.y > cy) {
            medStars[i] = new Star();
            continue;
        }

        ctx.beginPath();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = p.color;
        ctx.arc(p.x + cx, p.y + cy, p.radius, PI_TWO, false);
        ctx.fill();
        ctx.closePath();
    }

    i = len = p = tick = null;
}

function drawBigStarField() {
    var i, len, p, tick;

    for (i = 0, len = bigStars.length; i < len; i++) {
        p = bigStars[i];
        tick = (avg > 60) ? (avg/20) : (avg/80);
        p.y += p.dy * tick * 5;
        p.x += p.dx * tick * 5;
        p.z += p.dz;

        p.dx += p.ddx;
        p.dy += p.ddy;
        p.radius = .2 + ((p.max_depth - p.z) * 1.4);

        if (p.x < -cx || p.x > cx || p.y < -cy || p.y > cy) {
            bigStars[i] = new Star();
            continue;
        }

        ctx.beginPath();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = p.color;
        ctx.arc(p.x + cx, p.y + cy, p.radius, PI_TWO, false);
        ctx.fill();
        ctx.closePath();
    }

    i = len = p = tick = null;
}

function drawAverageCircle() {
    var i, len, p, value, xc, yc;

    if (avg > AVG_BREAK_POINT) {
        rotation += -bubble_avg_tick;
        value = avg + random() * 10;
        ctx.strokeStyle = bubble_avg_line_color_2;
        ctx.fillStyle = bubble_avg_color_2;
    } else {
        rotation += bubble_avg_tick;
        value = avg;
        ctx.strokeStyle = bubble_avg_line_color;
        ctx.fillStyle = bubble_avg_color;
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    ctx.moveTo(avg_points[0].dx, avg_points[0].dy);

    for (i = 0, len = TOTAL_AVG_POINTS; i < len - 1; i ++) {
        p = avg_points[i];
        p.dx = p.x + value * sin(PI_HALF * p.angle);
        p.dy = p.y + value * cos(PI_HALF * p.angle);
        xc = (p.dx + avg_points[i+1].dx) / 2;
        yc = (p.dy + avg_points[i+1].dy) / 2;

        ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    }

    p = avg_points[i];
    p.dx = p.x + value * sin(PI_HALF * p.angle);
    p.dy = p.y + value * cos(PI_HALF * p.angle);
    xc = (p.dx + avg_points[0].dx) / 2;
    yc = (p.dy + avg_points[0].dy) / 2;

    ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    ctx.quadraticCurveTo(xc, yc, avg_points[0].dx, avg_points[0].dy);

    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.closePath();

    i = len = p = value = xc = yc = null;
}

function drawBigAverageCircle() {
    var i, len, p, value, xc, yc;

    if (avg < 50) {
        rotation += -bubble_avg_tick;
        value = avg + random() * 10;
        ctx.strokeStyle = bubble_avg_line_color;
        ctx.fillStyle = bubble_avg_color;
    } else {
        rotation += bubble_avg_tick * 100;
        value = avg*1.5;
        ctx.strokeStyle = bubble_avg_line_color_3;
        ctx.fillStyle = bubble_avg_color_3;
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);

    ctx.moveTo(avg_points[0].dx, avg_points[0].dy);

    for (i = 0, len = TOTAL_AVG_POINTS; i < len - 1; i ++) {
        p = bigAvg_points[i];
        p.dx = p.x + value * sin(PI_HALF * p.angle);
        p.dy = p.y + value * cos(PI_HALF * p.angle);
        xc = (p.dx + bigAvg_points[i+1].dx) / 2;
        yc = (p.dy + bigAvg_points[i+1].dy) / 2;

        ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    }

    p = bigAvg_points[i];
    p.dx = p.x + value * sin(PI_HALF * p.angle) ;
    p.dy = p.y + value * cos(PI_HALF * p.angle) ;
    xc = (p.dx + bigAvg_points[0].dx) / 2;
    yc = (p.dy + bigAvg_points[0].dy) / 2;

    ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    ctx.quadraticCurveTo(xc, yc, bigAvg_points[0].dx, bigAvg_points[0].dy);

    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.closePath();

    i = len = p = value = xc = yc = null;
}

function drawWaveform() {
    var i, len, p, value, xc, yc;

    if (avg > 50) {
        rotation += waveform_tick;
        ctx.strokeStyle = waveform_line_color_2;
        ctx.fillStyle = waveform_color_2;
    } else {
        rotation += -waveform_tick;
        ctx.strokeStyle = waveform_line_color;
        ctx.fillStyle = waveform_color;
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.lineCap = "round";

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation)
    ctx.translate(-cx, -cy);

    ctx.moveTo(points[0].dx, points[0].dy);

    for (i = 0, len = TOTAL_POINTS; i < len - 1; i ++) {
        p = points[i];
        value = timeData[i];
        p.dx = p.x + value * sin(PI_HALF * p.angle) ;
        p.dy = p.y + value * cos(PI_HALF * p.angle) ;
        xc = (p.dx + points[i+1].dx) / 2;
        yc = (p.dy + points[i+1].dy) / 2;

        ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    }

    value = timeData[i];
    p = points[i];
    p.dx = p.x + value * sin(PI_HALF * p.angle) ;
    p.dy = p.y + value * cos(PI_HALF * p.angle) ;
    xc = (p.dx + points[0].dx) / 2;
    yc = (p.dy + points[0].dy) / 2;

    ctx.quadraticCurveTo(p.dx, p.dy, xc, yc);
    ctx.quadraticCurveTo(xc, yc, points[0].dx, points[0].dy);

    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.closePath();

    i = len = p = value = xc = yc = null;
}


const COLORS = {
  RED:      '#FD5061',
  YELLOW:   '#FFCEA5',
  BLACK:    '#29363B',
  WHITE:    'white',
  VINOUS:   '#A50710'
}

burstList = [];
largeCircleList = [];
smallCircleList = [];


function Burst(){
  burst = new mojs.Burst({
    left: window.innerWidth/2, top: window.innerHeight/2,
    count:          5,
    radius:         { 50: 700 },
    children: {
      shape:        'line',
      stroke:       [ 'white', '#ff005a', '#9dfc9d', '#B5BFD4', '#B8E986', '#D0D202' ],
      scale:        1,
      scaleX:       { 1 : 0 },
      pathScale:    'rand(.5, 1.25)',
      degreeShift:  'rand(-90, 90)',
      radius:       'rand(20, 40)',
      delay:        'rand(0, 150)',
      isForce3d:    true,

      },
  });

burst.play();

}



function drawBurst(){
      maxCount = 5;

      setInterval(function(){
        burstCount = burstList.length;
        if (avg > 70 && burstCount < maxCount){
          burstList.push(new Burst());
          }

        },10);

      setInterval(function(){
        burstList.forEach(function(){
          burstList.pop(this);
          })
        }, 2000);
}



function LargeCircle(){
  circle = new mojs.Shape({
    left: window.innerWidth/2, top: window.innerHeight/2,
    scale:      { 0: 1 },
    fill:       'none',
    stroke:     'white',
    strokeWidth: 60,
    opacity:    { 1 : 0 },
    radius:     600,
    duration:   600,
  });

circle.play();

}


function drawLargeCircle(){
      maxCount = 4;

      setInterval(function(){
        circleCount = largeCircleList.length;
        if (avg > 90 && circleCount < maxCount){
          largeCircleList.push(new LargeCircle());
          }

        },500);

      setInterval(function(){
        largeCircleList.forEach(function(){
          largeCircleList.pop(this);
          })
        }, 2000);
}

function SmallCircle(){
  circle = new mojs.Shape({
    left: window.innerWidth/2, top: window.innerHeight/2,
    scale:      { 0: 1 },
    fill:       'none',
    stroke:     'white',
    strokeWidth: 3,
    opacity:    { .75 : 0 },
    radius:     400,
    duration:   1200,
  });

circle.play();

}


function drawSmallCircle(){
      maxCount = 4;

      setInterval(function(){
        circleCount = smallCircleList.length;
        if (avg > 70 && circleCount < maxCount){
          smallCircleList.push(new SmallCircle());
          }

        },50);

      setInterval(function(){
        smallCircleList.forEach(function(){
          smallCircleList.pop(this);
          })
        }, 2000);
}


function animate() {
    if (!playing) return;

    window.requestAnimationFrame(animate);
    analyser.getByteFrequencyData(frequencyData);
    analyser.getByteTimeDomainData(timeData);
    avg = getAvg([].slice.call(frequencyData)) * gainNode.gain.value;

    clearCanvas();

    if (SHOW_STAR_FIELD) {
        drawStarField();
        drawMedStarField();
        drawBigStarField();
    }

    if (SHOW_AVERAGE) {
        drawAverageCircle();
        drawBigAverageCircle();
    }

    if (SHOW_WAVEFORM) {
        drawWaveform();
    }



    // drawBurst();



}

function Star() {
    var xc, yc;

    this.x = Math.random() * w - cx;
    this.y = Math.random() * h - cy;
    this.z = this.max_depth = Math.max(w/h);
    this.radius = 0.2;

    xc = this.x > 0 ? 1 : -1;
    yc = this.y > 0 ? 1 : -1;

    if (Math.abs(this.x) > Math.abs(this.y)) {
        this.dx = 1.0;
        this.dy = Math.abs(this.y / this.x);
    } else {
        this.dx = Math.abs(this.x / this.y);
        this.dy = 1.0;
    }

    this.dx *= xc;
    this.dy *= yc;
    this.dz = -0.1;

    this.ddx = .001 * this.dx;
    this.ddy = .001 * this.dy;

    if (this.y > (cy/2)) {
        this.color = stars_color_2;
    } else {
        if (avg > AVG_BREAK_POINT + 10) {
            this.color = stars_color_2;
        } else if (avg > STARS_BREAK_POINT) {
            this.color = stars_color_special;
        } else {
            this.color = stars_color;
        }
    }

    xc = yc = null;
}


function createStarField() {
    var i = -1;

    while(++i < TOTAL_STARS) {
        stars.push(new Star());
    }

    i = null;
}

function createMedStarField() {
    var i = -1;

    while(++i < TOTAL_STARS/20) {
        medStars.push(new Star());
    }

    i = null;
}

function createBigStarField() {
    var i = -1;

    while(++i < TOTAL_STARS/50) {
        bigStars.push(new Star());
    }

    i = null;
}

function Point(config) {
    this.index = config.index;
    this.angle = (this.index * 360) / TOTAL_POINTS;

    this.updateDynamics = function() {
        this.radius = Math.abs(w, h) / 10;
        this.x = cx + this.radius * sin(PI_HALF * this.angle);
        this.y = cy + this.radius * cos(PI_HALF * this.angle);
    }

    this.updateDynamics();

    this.value = Math.random() * 256;
    this.dx = this.x + this.value * sin(PI_HALF * this.angle);
    this.dy = this.y + this.value * cos(PI_HALF * this.angle);
}

function AvgPoint(config) {
    this.index = config.index;
    this.angle = (this.index * 360) / TOTAL_AVG_POINTS;

    this.updateDynamics = function() {
        this.radius = Math.abs(w, h) / 10;
        this.x = cx + this.radius * sin(PI_HALF * this.angle);
        this.y = cy + this.radius * cos(PI_HALF * this.angle);
    }

    this.updateDynamics();

    this.value = Math.random() * 256;
    this.dx = this.x + this.value * sin(PI_HALF * this.angle);
    this.dy = this.y + this.value * cos(PI_HALF * this.angle);
}

function createPoints() {
    var i;

    i = -1;
    while(++i < TOTAL_POINTS) {
        points.push(new Point({index: i+1}));
    }

    i = -1;
    while(++i < TOTAL_AVG_POINTS) {
        avg_points.push(new AvgPoint({index: i+1}));
    }

    i = -1;
    while(++i < TOTAL_AVG_POINTS) {
        bigAvg_points.push(new AvgPoint({index: i+1}));
    }

    i = null;
}

function resizeHandler() {
    w = window.innerWidth;
    h = window.innerHeight;
    cx = w / 2;
    cy = h / 2;

    ctx.canvas.width = w;
    ctx.canvas.height = h;

    points.forEach(function(p) {
        p.updateDynamics();
    });

    avg_points.forEach(function(p) {
        p.updateDynamics();
    });

    bigAvg_points.forEach(function(p) {
        p.updateDynamics();
    });
}
