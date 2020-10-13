import React, { useEffect, useRef, useState } from 'react';
import Rodal from 'rodal';
import io from 'socket.io-client';

import HeaderComponent from './components/header/header.component';

import './App.scss';
import 'rodal/lib/rodal.css';
import ContactComponent from './components/contact/contact.component';

interface SocketUser {
	name: string;
	socketId: string;
}

function App() {
	const socketURL = 'https://webrtc-server-api.herokuapp.com/';
	const socket = useRef<any>();

	const localVideoRef = useRef<any>();
	const remoteVideoRef = useRef<any>();
	const remoteStream = React.useRef(new MediaStream());

	const iceServers = {
		iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
	};
	const peerConnection = useRef(new RTCPeerConnection(iceServers));
	const [currentUser, setCurrentUser] = useState('');
	const [usersList, setUsersList] = useState<string[]>([]);
	const [callerId, setCallerId] = useState('');
	const [receivingCall, setReceivingCall] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [callAccepted, setCallAccepted] = useState(false);
	
	
	
	const initPeerConnection = async () => {
		const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
		console.log(localStream);
		localVideoRef.current.srcObject = localStream;
		remoteVideoRef.current.srcObject = remoteStream.current;

		localStream.getTracks().forEach((track) => {
			peerConnection.current.addTrack(track, localStream);
		});

		peerConnection.current.addEventListener('track', (e) => {
			remoteStream.current.addTrack(e.track);
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

		socket.current.on('offer', (event) => {
			setCallerId(event.from);
			setReceivingCall(true);
			setShowModal(true);
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});

		socket.current.on('answer', (event) => {
			console.log('ANSWER', event);
			setCallerId(event.from);
			setShowModal(false);
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});
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
			const description = await peerConnection.current.createOffer();
			peerConnection.current.setLocalDescription(description);
			socket.current.emit('offer', { name: friendId, from: currentUser, description: description })
		}
	};

	const acceptCall = async () => {
		setShowModal(false);
		setCallAccepted(true);
		const desc = await peerConnection.current.createAnswer();
		peerConnection.current.setLocalDescription(desc);
		socket.current.emit('answer', { description: desc, name: callerId, from: currentUser })
	}

	const rejectCall = () => {}

	let incomingCall;
	if (receivingCall) {
		incomingCall = (
			<div className='incomingCallContainer'>
				<div className='incomingCall flex flex-column'>
					<div>
						<span className='callerID'>{callerId}</span> is calling you!
					</div>
					<div className='incomingCallButtons flex'>
						<button name='accept' className='alertButtonPrimary' onClick={() => acceptCall()}>
							Accept
						</button>
						<button name='reject' className='alertButtonSecondary' onClick={() => rejectCall()}>
							Reject
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<React.Fragment>
			<HeaderComponent />

			<ContactComponent userName={currentUser} callFriend={handleCallFriend} />

			{/* <ConferenceComponent /> */}

			<video ref={localVideoRef} autoPlay style={{ width: 250, height: 250 }}></video>
			<video style={{ width: 250, height: 250, background: 'black' }} autoPlay ref={remoteVideoRef} />

			<div>
				<Rodal
					visible={showModal}
					showCloseButton={false}
					closeMaskOnClick={false}
					onClose={() => setShowModal(false)}
				>
					<div>{incomingCall}</div>
				</Rodal>
			</div>
		</React.Fragment>
	);
}

export default App;
