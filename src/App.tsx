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
		iceServers: [{ urls: 'stun:stun.services.mozilla.com' }, { urls: 'stun:stun.l.google.com:19302' }],
	};
	const peerConnection = useRef(new RTCPeerConnection(iceServers));
	const [userId, setUserId] = useState('');
	const [usersList, setUsersList] = useState<string[]>([]);
	const [callerId, setCallerId] = useState('');
	const [receivingCall, setReceivingCall] = useState(true);

	const userName = useRef('');

	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		socket.current = io.connect(socketURL);

		(async () => {
			const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			console.log(localStream);
			localVideoRef.current.srcObject = localStream;
			remoteVideoRef.current.srcObject = remoteStream.current;

			localStream.getTracks().forEach((track) => {
				peerConnection.current.addTrack(track, localStream);
			});

			peerConnection.current.addEventListener('icecandidate', (e) => {
				if (e.candidate) {
					console.log('Sending Ice', e);
					console.log('CallerId', callerId);
					console.log('userId', userId);
					console.log('userName', userName);
					socket.current.emit('ice-candidate', { name: userName.current, candidate: e.candidate });

				}
			});

			peerConnection.current.addEventListener('track', (e) => {
				remoteStream.current.addTrack(e.track);
			});
		})();

		socket.current.on('conn-success', (data: SocketUser) => {
			console.log('CurrentUser', data);
			setUserId(data.name);
		});

		socket.current.on('users-list', (list: string[]) => {
			console.log('UsersList', list);
			setUsersList(list);
		});

		socket.current.on('offer', (event) => {
			console.log('AAAAA', event);
			console.log('userID', userId);
			setCallerId(event.from);
			userName.current = event.from;
			setReceivingCall(true);
			setShowModal(true);
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});

		socket.current.on('answer', (event) => {
			console.log('ANSWER', event);
			console.log('INANSWERcallerId', callerId);
			console.log('INANSWERuserId', userId);
			setCallerId(event.from);
			userName.current = event.from;

			setShowModal(false);
			peerConnection.current.setRemoteDescription(new RTCSessionDescription(event.description));
		});

		socket.current.on("ice-candidate", (data) => {
			console.log("Candidate ",data);
			peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate)) ;
		});
		  
	}, []);

	const handleCallFriend = async (friendId: string) => {
		console.log(usersList);
		const inUsersList = usersList.some((user) => user === friendId);

		if (inUsersList && friendId !== userId) {
			console.log(`Calling ${friendId}`);
			const description = await peerConnection.current.createOffer();
			peerConnection.current.setLocalDescription(description);

			console.log('Desc', description);
			socket.current.emit('offer', { name: friendId, from: userId, description: description })
		}
	};

	const acceptCall = async () => {
		const desc = await peerConnection.current.createAnswer();
		peerConnection.current.setLocalDescription(desc);
		console.log('EMITANSWERcallerId', callerId);
		console.log('EMITANSWERuserId', userId);
		socket.current.emit('answer', { description: desc, name: callerId, from: userId })
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

			<ContactComponent userName={userId} callFriend={handleCallFriend} />

			{/* <ConferenceComponent /> */}

			{incomingCall}

			<video ref={localVideoRef} autoPlay style={{ width: 250, height: 250 }}></video>
			<video style={{ width: 250, height: 250, background: 'black' }} autoPlay ref={remoteVideoRef} />

			<div>
				<Rodal visible={showModal} onClose={() => setShowModal(false)}>
					<div>{incomingCall}</div>
				</Rodal>
			</div>
		</React.Fragment>
	);
}

export default App;
