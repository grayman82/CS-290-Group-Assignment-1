    var source = null;
    var analyser = null;
    var buffer = null;
    var impbuffer = null;
    var convbuffer = null;
    var X = [[]];
    var R = 100.0;
    //Playing information
    var playTime = 0;
    var startTime = 0;
    var offsetTime = 0;
    var playing = false;

    var context = new (window.AudioContext || window.webkitAudioContext)();

    function disconnect() {
        source.stop();
        source.disconnect(0);
        analyser.disconnect(0);
    }

    function playAudioSource() {
        playAudio(buffer);
    }
    
    function playAudioImpulse() {
        playAudio(impbuffer);
    }
    
    function playAudioConv() {
        playAudio(convbuffer);
    }
    
    function playAudio(b) {
        if (context === null) {
            return;
        }
        if (!(source === null)) {
            source.stop();
        }
        source = context.createBufferSource();
        source.buffer = b;
        analyser = context.createAnalyser();
        source.connect(analyser);
        analyser.connect(context.destination);

        startTime = context.currentTime;
        
        source.start();
        playing = true;
    }
    
    function pauseAudio() {
        if (source === null) {
            return;
        }
        playing = false;
        source.stop();
    }
    
    //Do fast fft-based convolution
    function doConvolution(buffer1, buffer2) {
        var convFinished = document.getElementById('convFinished');
        convFinished.innerHTML = "<h3><font color = 'red'>Doing convolution..</font></h3>";
        var samples1 = buffer1.getChannelData(0);
        M = samples1.length;
        var samples2 = buffer2.getChannelData(0);
        N = samples2.length;
        
        //Zeropad to nearest power of 2 above N+M+1
        var NPadded = Math.pow(2, Math.ceil(Math.log(N+M+1)/Math.log(2)));
        
        //Zeropad signal 1
        var X = new Float32Array(NPadded);
        for (var i = 0; i < NPadded; i++) {
            if (i < M) {
                X[i] = samples1[i];
            }
            else {
                X[i] = 0;
            }
        }
        //Zeropad signal 2
        var Y = new Float32Array(NPadded);
        for (var i = 0; i < NPadded; i++) {
            if (i < N) {
                Y[i] = samples2[i];
            }
            else {
                Y[i] = 0;
            }
        }
        //For now, assume both sounds are sampled at 44100hz
        var fftX = new FFT(NPadded, NPadded);
        var fftY = new FFT(NPadded, NPadded);
        fftX.forward(X);
        fftY.forward(Y);
        //Multiply both in the frequency domain
        var real = new Float32Array(NPadded);
        var imag = new Float32Array(NPadded);
        for (var i = 0; i < NPadded; i++) {
            real[i] = fftX.real[i]*fftY.real[i] - fftX.imag[i]*fftY.imag[i];
            imag[i] = fftX.real[i]*fftY.imag[i] + fftX.imag[i]*fftY.real[i];
        }
        var fftRes = new FFT(NPadded, NPadded);
        var res = fftRes.inverse(real, imag);
        var maxAbs = 0.0;
        //Normalize output to prevent clipping
        for (var i = 0; i < res.length; i++) {
            if (Math.abs(res[i]) > maxAbs) {
                maxAbs = Math.abs(res[i]);
            }
        }
        //TODO: Allocate space for the output buffer and copy over
        var convsamples = convbuffer.getChannelData(0);
        /*for (var i = 0; i < res.length; i++) {
            res[i] /= maxAbs;
            if (i < M) {
                convsamples[i] = res[i];
            }
        }*/
    }
    
    var audioInput = document.getElementById('audioInput');
    audioInput.addEventListener('change', function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            if(context.decodeAudioData) {
                context.decodeAudioData(data, function(buff) {
                buffer = buff;
                }, function(e) {
                    console.log(e);
                });
            }
        }        
        reader.readAsArrayBuffer(audioInput.files[0]);

        //Also allocate space for the buffer storing the convolution
        var reader2 = new FileReader();
        reader2.onload = function(e) {
            var data = e.target.result;
            if(context.decodeAudioData) {
                context.decodeAudioData(data, function(buff) {
                convbuffer = buff;
                }, function(e) {
                    console.log(e);
                });
            }
        }        
        reader2.readAsArrayBuffer(audioInput.files[0]);
        
        var sourceLoaded = document.getElementById('sourceLoaded');
        sourceLoaded.innerHTML = "<h3><font color = 'green'>Loaded</font></h3>";
    });
    
    var impulseInput = document.getElementById('impulseInput');
    impulseInput.addEventListener('change', function(e) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            if(context.decodeAudioData) {
                context.decodeAudioData(data, function(buff) {
                impbuffer = buff;
                }, function(e) {
                    console.log(e);
                });
            }
        }        
        reader.readAsArrayBuffer(impulseInput.files[0]);
        var impulseLoaded = document.getElementById('impulseLoaded');
        impulseLoaded.innerHTML = "<h3><font color = 'green'>Loaded</font></h3>";
    });
