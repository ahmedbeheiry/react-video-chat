import React, { useState } from 'react';

import './contact.styles.scss';

interface PropsModel {
	userName: string;
	callFriend: (id: string) => void;
}

const ContactComponent: React.FC<PropsModel> = ({ userName, callFriend }) => {

	const [formUserId, setFormUserId] = useState('');

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		console.log(formUserId);

		if (formUserId.trim() === '') {
			return;
		}

		callFriend(formUserId);
	}
	return (
		<React.Fragment>
			<div className='container hero'>
				<div className='hero__content'>
					<h2>Free &amp; Easy Video Calls</h2>
					<p>Video call whoever you want easily</p>
				</div>

				<form className='hero__form' onSubmit={handleSubmit}>
					<input type='text' placeholder="Friend's name.." value={formUserId} onChange={(e) => setFormUserId(e.target.value)} />
					<button type='submit'>Call Now</button>
				</form>

				<div className='hero__hint'>
					<p>
						To call your friend, let them open VideoChat on their browser.
						<br />
						After sending them your username <strong>'{userName}'</strong>, let them call you. You can call them with the same steps.
					</p>
				</div>
			</div>
		</React.Fragment>
	);
};

export default ContactComponent;
