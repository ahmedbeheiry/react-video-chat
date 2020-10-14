import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Howl } from 'howler';
import HeaderComponent from './components/header/header.component';
import ContactComponent from './components/contact/contact.component';
import './App.scss';
import 'rodal/lib/rodal.css';

const ringtone = require('./sound/ringtone.mp3');

interface SocketUser {
	name: string;
	socketId: string;
}

const ringtoneSound = new Howl({
	src: ringtone,
	loop: true,
	preload: true
});

function App() {
	const socketURL = 'https://webrtc-server-api.herokuapp.com/';
	const socket = useRef<any>();

	const localVideoRef = useRef<any>();
	const remoteVideoRef = useRef<any>();

	const iceServers = {
		iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
	};
	const peerConnection = useRef(new RTCPeerConnection(iceServers));
	const [currentUser, setCurrentUser] = useState('');
	const [usersList, setUsersList] = useState<string[]>([]);
	const [callerId, setCallerId] = useState('');
	const [receivingCall, setReceivingCall] = useState(false);
	const [callAccepted, setCallAccepted] = useState(false);
	const [isCalling, setIsCalling] = useState(false);

	const userStream = useRef<any>();
	
	const getUserStream = async () => {
		const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
		console.log(localStream);
		localVideoRef.current.srcObject = localStream;
		userStream.current = localStream;
		userStream.current.getTracks().forEach((track) => {
			peerConnection.current.addTrack(track, userStream.current);
		});
	}
	
	const initPeerConnection = async () => {
		peerConnection.current.addEventListener('track', (e) => {
			remoteVideoRef.current.srcObject = e.streams[0];
		});

	}

	const initSocketConnection = () => {
		socket.current = io.connect(socketURL);
		
		socket.current.on('conn-success', (data: SocketUser) => {
			setCurrentUser(data.name);
		});

		socket.current.on('users-list', (list: string[]) => {
			setUsersList(list);
		});

		socket.current.on("ice-candidate", (data) => {
			console.log("Candidate ",data);
			peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate)) ;
		});

		socket.current.on('offer', async (event) => {
			setCallerId(event.from);
			setReceivingCall(true);
			ringtoneSound.play();
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});

		socket.current.on('answer', (event) => {
			console.log('ANSWER', event);
			setCallerId(event.from);
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});

		socket.current.on('reject', () => {
			window.location.reload();
		});

		socket.current.on('cancel', () => {
			window.location.reload();
		})
	}

	useEffect(() => {
		initPeerConnection();
		initSocketConnection();
	}, []);

	useEffect(() => {
		if(!callerId){
            return ;
		}
		peerConnection.current.addEventListener('icecandidate', (e) => { // Logical place to start listening on this is when you got an id from server (Not here) ,But I made it like that to illustrate the concept of closures (The problem that faced us today)
			if (e.candidate) {
				console.log('Sending Ice', e);
				socket.current.emit('ice-candidate', { name: callerId, candidate: e.candidate });
			}
		});
		  
	},[callerId]);


	const handleCallFriend = async (friendId: string) => {
		console.log(usersList);
		const inUsersList = usersList.some((user) => user === friendId);

		if (inUsersList && friendId !== currentUser) {
			console.log(`Calling ${friendId}`);
			await getUserStream();
			setIsCalling(true);
			setCallerId(friendId);
			const description = await peerConnection.current.createOffer();
			peerConnection.current.setLocalDescription(description);
			socket.current.emit('offer', { name: friendId, from: currentUser, description: description })
		}
	};

	const acceptCall = async () => {
		setCallAccepted(true);
		setReceivingCall(false);
		ringtoneSound.stop();
		await getUserStream();
		const desc = await peerConnection.current.createAnswer();
		peerConnection.current.setLocalDescription(desc);
		socket.current.emit('answer', { description: desc, name: callerId, from: currentUser })
	}

	const handleDeclineCall = () => {
		console.log('Cancel CALL from', callerId);
		socket.current.emit('reject', { from: currentUser, name: callerId, reject: true });
		window.location.reload();
	}

	const handleEndCall = () => {
		console.log(`End call with ${callerId}`);
		socket.current.emit('cancel', { from: currentUser, name: callerId, cancel: true });
		window.location.reload();
	}

	let incomingCall;
	if (receivingCall) {
		incomingCall = (
			<div className='incoming-call flex flex-column'>
				<div className="incoming-call__avatar">
					<i className="icon icon-user"></i>
				</div>
				<h2 className='incoming-call__username'>{callerId}</h2>
				<p>is calling you!</p>

				<div className='incoming-call__cta flex'>
					<button className='btn accept' onClick={acceptCall}>
						<i className="icon icon-accept"></i>
					</button>
					<button className='btn decline' onClick={handleDeclineCall}>
						<i className="icon icon-decline"></i>
					</button>
				</div>
			</div>
		);
	}

	const renderConference = () => {
		return isCalling || callAccepted;
	}

	const renderLandingPage = () => {
		return !isCalling && !receivingCall && !callAccepted;
	}

	return (
		<React.Fragment>

			<div style={{ display: renderLandingPage() ? 'block' : 'none' }}>
				<HeaderComponent />
				<ContactComponent userName={currentUser} callFriend={handleCallFriend} />
			</div>

			{incomingCall}

			<div className="call-wrapper" style={{ display: renderConference() ? 'block' : 'none' }}>
				<div className="local-video-wrapper">
					<video ref={localVideoRef} autoPlay />
				</div>
				<div className="remote-video-wrapper">
					<video ref={remoteVideoRef} autoPlay />
				</div>

				<button className="end-call" onClick={handleEndCall}>
					<i className="icon icon-decline"></i>
				</button>
			</div>
		</React.Fragment>
	);
}

export default App;
