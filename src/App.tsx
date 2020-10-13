import React, { useEffect, useRef, useState } from 'react';
// import Rodal from 'rodal';
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
	// const remoteStream = React.useRef(new MediaStream());

	// const iceServers = {
	// 	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
	// };
	const iceServers = {
		iceServers: [
			{
				urls: "stun:numb.viagenie.ca",
				username: "sultan1640@gmail.com",
				credential: "98376683"
			},
			{
				urls: "turn:numb.viagenie.ca",
				username: "sultan1640@gmail.com",
				credential: "98376683"
			}
		]
	}
	const peerConnection = useRef(new RTCPeerConnection(iceServers));
	const [currentUser, setCurrentUser] = useState('');
	const [usersList, setUsersList] = useState<string[]>([]);
	const [callerId, setCallerId] = useState('');
	const [receivingCall, setReceivingCall] = useState(false);
	const [, setShowModal] = useState(false);
	const [callAccepted, setCallAccepted] = useState(false);
	const [isCalling, setIsCalling] = useState(false);

	const localStream = useRef<any>();
	// const userStream = useRef<any>();
	
	// const getUserStream = async () => {
	// 	const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	// 	console.log(localStream);
	// 	localVideoRef.current.srcObject = localStream;
	// 	userStream.current = localStream;
	// 	userStream.current.getTracks().forEach((track) => {
	// 		peerConnection.current.addTrack(track, userStream.current);
	// 	});
	// }
	
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
			// await getUserStream();

			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			console.log(stream);
			localVideoRef.current.srcObject = stream;
			localStream.current = stream;
			// userStream.current = localStream;

			localStream.current.getTracks().forEach(track => 
				peerConnection.current.addTrack(track, localStream.current)
			);
			console.log('Added local stream to pc1');


			setIsCalling(true);
			const description = await peerConnection.current.createOffer();
			peerConnection.current.setLocalDescription(description);
			socket.current.emit('offer', { name: friendId, from: currentUser, description: description })
		}
	};

	const acceptCall = async () => {
		setShowModal(false);
		setCallAccepted(true);
		setReceivingCall(false);
		// await getUserStream();
		// userStream.current = new MediaStream();
		// userStream.current.getTracks().forEach((track) => {
		// 	console.log('TRR');
		// 	// peerConnection.current.addTrack(track, userStream.current);
		// });

		console.log('ACEPT BEFORE');

		try {
			
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
				console.log(stream);
		} catch (error) {
			console.log(error)
		}

		// 	localVideoRef.current.srcObject = stream;
		// 	localStream.current = stream;
		// 	// userStream.current = localStream;

		// 	localStream.current.getTracks().forEach(track => 
		// 		peerConnection.current.addTrack(track, localStream.current)
		// 	);
		
		peerConnection.current.addEventListener('track', (e) => {
			console.log('EEEE', e);
			remoteVideoRef.current.srcObject = e.streams[0];
		});
		const desc = await peerConnection.current.createAnswer();
		peerConnection.current.setLocalDescription(desc);
		socket.current.emit('answer', { description: desc, name: callerId, from: currentUser })
	}

	const declineCall = () => {}

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
						<button className='btn decline' onClick={declineCall}>
							<i className="icon icon-decline"></i>
						</button>
					</div>
				</div>
		);
	}
		// incomingCall = (
		// 	<div className='incomingCallContainer'>
		// 		<div className='incomingCall flex flex-column'>
		// 			<div>
		// 				<span className='callerID'>{callerId}</span> is calling you!
		// 			</div>
		// 			<div className='incomingCallButtons flex'>
		// 				<button name='accept' className='alertButtonPrimary' onClick={() => acceptCall()}>
		// 					Accept
		// 				</button>
		// 				<button name='reject' className='alertButtonSecondary' onClick={() => declineCall()}>
		// 					Reject
		// 				</button>
		// 			</div>
		// 		</div>
		// 	</div>
		// );

	const renderConference = () => {
		return isCalling || callAccepted;
	}

	return (
		<React.Fragment>

			<div style={{ display: renderConference() ? 'none' : "block" }}>
				<HeaderComponent />
				<ContactComponent userName={currentUser} callFriend={handleCallFriend} />
			</div>

			{incomingCall}

			<div className="call-wrapper" style={{ display: renderConference() ? 'block' : "none" }}>
				<div className="local-video-wrapper">
					<video ref={localVideoRef} autoPlay />
				</div>
				<div className="remote-video-wrapper">
					<video ref={remoteVideoRef} autoPlay />
				</div>

				<button className="end-call">
					<i className="icon icon-decline"></i>
				</button>
			</div>


			{/* <div>
				<Rodal
					visible={showModal}
					showCloseButton={false}
					closeMaskOnClick={false}
					onClose={() => setShowModal(false)}
				>
					<div>{incomingCall}</div>
				</Rodal>
			</div> */}
		</React.Fragment>
	);
}

export default App;
