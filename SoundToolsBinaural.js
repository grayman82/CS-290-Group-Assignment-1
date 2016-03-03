//Programmer: Chris Tralie
//Purpose: Handle stereo impulse response convolution
function doConvolutionArrays(samples1, samples2) {
    M = samples1.length;
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
    return res;
}

//Do fast fft-based convolution
function doConvolution(buffer, impbuffer) {
    var samples1 = buffer.getChannelData(0);
    M = samples1.length;
    N = impbuffer.getChannelData(0).length;
    //Zeropad to nearest power of 2 above N+M+1
    var NPadded = Math.pow(2, Math.ceil(Math.log(N+M+1)/Math.log(2)));

    //Allocate space for the output buffer and copy over
    convbuffer = context.createBuffer(2, NPadded, globalFs);
    var resL = doConvolutionArrays(samples1, impbuffer.getChannelData(0));
    var convsamplesL = convbuffer.getChannelData(0);
    for (var i = 0; i < resL.length; i++) {
        convsamplesL[i] = resL[i];
    }
    var resR = doConvolutionArrays(samples1, impbuffer.getChannelData(1));
    var convsamplesR = convbuffer.getChannelData(1);
    for (var i = 0; i < resR.length; i++) {
        convsamplesR[i] = resR[i];
    }
}
