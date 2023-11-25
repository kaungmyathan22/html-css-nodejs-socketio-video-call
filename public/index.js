const socket = io()
const fromSocket = document.getElementById('userId')
const localVideo = document.getElementById('localVideo')
const call = document.getElementById('call')
const mute = document.getElementById('mute')
const unMute = document.getElementById('unMute')
const cameraOff = document.getElementById('camera-off')
const cameraOn = document.getElementById('camera-on')
const stop = document.getElementById('stop')
const toSocket = document.getElementById('toSocket')
configuration = {iceServers : [{urls : 'stun:stun.l.google.com:19302'}]}
let peer = new RTCPeerConnection(configuration)
let tracks = [];
let fromSocketId,toSocketId;
//get Local Media
const openMediaDevices = async() => {
    try {
        let stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
        localVideo.srcObject = stream
        tracks = stream.getTracks()
        return stream
    } catch (error) {
        console.log(error)
    }
}

// create offer
const createOffer = async() => {
    try {
        console.log()
        let stream = await  openMediaDevices()
        stream.getTracks().forEach( track => peer.addTrack(track))
        let offer = await peer.createOffer()
        peer.setLocalDescription (new RTCSessionDescription(offer))
        peer.addEventListener("icecandidate",e=>{
            console.log(e)
            socket.emit("callerCandidate",{'candidate':e.candidate,"fromSocketId": fromSocketId, 'toSocketId': toSocketId})
        })
        //send Offer to Server
        toSocketId = toSocket.value
        socket.emit('offer', {'offer': offer, "fromSocketId": fromSocketId, 'toSocketId': toSocketId})
    } catch (error) {
        console.log(error)
    }
}

//create Answer
const createAnswer = async(destination) => {
    let stream = await  openMediaDevices();
    stream.getTracks().forEach( track => peer.addTrack(track));
    let answer = await peer.createAnswer();
    peer.setLocalDescription (new RTCSessionDescription(answer));
    peer.addEventListener("icecandidate",e=>{
            console.log(e)
            socket.emit("calleeCandidate",{'candidate':e.candidate,"fromSocketId": fromSocketId, 'toSocketId': toSocketId})
        })
    socket.emit('answer', {'answer': answer, 'destination': destination})
}

//#region ----- socket
//receive Offer
socket.on('offer', data => {
    peer.setRemoteDescription(data.offer)
    createAnswer(data.fromSocketId);
    const stream = new MediaStream();
    peer.ontrack =  e=> {
        stream.addTrack(e.track);
        remoteVideo.srcObject = stream
    }
    addBtnHandlers();
});

socket.on("answer",data=>{
    peer.setRemoteDescription(data.answer)
    const stream = new MediaStream();
    peer.ontrack =  e=> {
        stream.addTrack(e.track);
        remoteVideo.srcObject = stream
    }
})

socket.on("connect",()=>{
    fromSocket.innerHTML = socket.id;
    fromSocketId = socket.id;
});

socket.on('callerCandidate', data => {
    peer.addIceCandidate(data)
})

socket.on('calleeCandidate', data => {
    peer.addIceCandidate(data)
})
//#endregion

call.addEventListener("click", async ()=>{
    createOffer();
    addBtnHandlers();
    console.log("clicking");
})

//Stop Tracks
const addBtnHandlers = ()=> {
    stop.addEventListener('click',stopTracks)
    mute.addEventListener('click',muteTracks)
    unMute.addEventListener('click',unmuteTracks)
    cameraOff.addEventListener('click',muteVideoTrack)
    cameraOn.addEventListener('click',unmuteVideoTrack)

}

const stopTracks = () => {
    tracks.forEach( track => track.stop())
}

// mute tracks
const muteTracks = ()=> {
  tracks.forEach(track => {
    if (track.kind === 'audio') {
      track.enabled = false;
    }
  });
}
// mute tracks
const unmuteTracks = ()=> {
  tracks.forEach(track => {
    if (track.kind === 'audio') {
      track.enabled = true;
    }
  });
}

// mute video
const muteVideoTrack = ()=>{
      tracks.forEach(track => {
    if (track.kind === 'video') {
      track.enabled = false;
    }
  });
}

const unmuteVideoTrack = ()=>{
      tracks.forEach(track => {
    if (track.kind === 'video') {
      track.enabled = true;
    }
  });
}