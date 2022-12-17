let App_ID = "f75c8a3f67414db09275bf54e8266b2c"

let token = null;
let uid =  String(Math.floor(Math.random() * 10000))                                                          //User Id

let client; // Login and access to all funtion
let channel; // allows to send the messages

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomID = urlParams.get('room')

if(!roomID){
    window.location = 'lobby.html'
}

let localStream; // local camera video and audio feed
let remoteStream;
let peerConnection // Our another camera window


// Creating stun server Generally not need locally but in Deployement
const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080}

    },
    audio:true
}

let init = async () =>{
    client = await AgoraRTM.createInstance(App_ID)
    await client.login({uid, token})

    // index.html?room=23456
    // channel = client.createChannel(roomID)
    channel = client.createChannel(roomID)
    await channel.join() // log in with the client

    channel.on('MemberJoined', handleUserJoined)
    channel.on('MemberLeft', handleUserLeft)

    client.on('MessageFromPeer', handleMessageFromPeer)


    localStream = await navigator.mediaDevices.getUserMedia(constraints) // This will request the camera access
    document.getElementById('user-1').srcObject = localStream;
}

let handleUserLeft = (MemberId)=>{
    document.getElementById('user-2').style.display = 'none'
    document.getElementById('user-1').classList.remove('smallframe')

}

let handleMessageFromPeer = async (message , MemberId)=>{
    message = JSON.parse(message.text)
    // console.log('Message:', message)

    if(message.type === 'offer'){
        createAnswer(MemberId, message.offer)
    }

    if(message.type === 'answer'){
        addAnswer(message.answer)
    }

    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate)
        }
    }
}

let handleUserJoined = async(MemberId)=>{
    console.log('A New user Joined the channel:', MemberId)
    createOffer(MemberId)

}

let createPeerConnection = async(MemberId)=>{
    peerConnection = new RTCPeerConnection(servers)  //A WebRTC connection between the local computer and a remote peer. It provides methods to connect to a remote peer, maintain and monitor the connection, and close the connection once it's no longer needed.

        
    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject = remoteStream    
    document.getElementById('user-2').style.display = 'block'

    document.getElementById('user-1').classList.add('smallframe')
    

    if(!localStream){
        localStream = await navigator.mediaDevices.getUserMedia({video:true, audio:true}) // This will request the camera access
        document.getElementById('user-1').srcObject = localStream;
    }

    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track, localStream)        

    })

    // When Our Remote Peer Adds the track

    peerConnection.ontrack = (event)=>{
        event.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track)
        })
    }
       
    peerConnection.onicecandidate = async(event)=>{                                     // From Created offer "setLocalDescription" Triggers the onicecandidate
        if(event.candidate){
            client.sendMessageToPeer({text: JSON.stringify({'type': 'candidate', 'candidate': event.candidate})}, MemberId)
        }
    }
}

// Creating an Offer
let createOffer = async(MemberId)=>{         
    await createPeerConnection(MemberId)

    // Creating an Offer
    let offer  = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    console.log('Offer:', offer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'offer', 'offer': offer})}, MemberId)
}

let createAnswer = async  (MemberId , offer)=>{
    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)


    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text: JSON.stringify({'type': 'answer', 'answer': answer})}, MemberId)

}

let addAnswer = async(answer)=>{
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer)
    }
}

let leaveChannel = async()=>{
    await channel.leave()
    await client.logout()
}


let toggleCamera = async()=>{
    let videoTrack = localStream.getTracks().find(track => track.kind ==='video')
    if(videoTrack.enabled){
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80 , 80)'
    }else{
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(179, 102 , 249, .9)'
    }
}
let toggleMic = async()=>{
    let audioTrack = localStream.getTracks().find(track => track.kind ==='audio')
    if(audioTrack.enabled){
        audioTrack.enabled = false;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80 , 80)'
    }else{
        audioTrack.enabled = true;
        document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102 , 249, .9)'
    }
}

window.addEventListener('beforeunload', leaveChannel)

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
init()