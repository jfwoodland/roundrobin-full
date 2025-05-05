# RoundRobin Project Requirements

## Project Description

This is a round-robin calling system.  There will be a main account phone number, which when called will ring through to a list of users' numbers one by one in order until someone answers.

### Calling Features

- The caller will hear an automated voice indicating that the round-robin calling is in process
- The caller will hear 'on hold' music while waiting
- The users will be required to press a key to take the call to differentiate a person from a voicemail answering
- The users will hear a voice prompt instructing them to press a key to take the call
- Once a user takes a call, the round-robin calling will immediately stop proceeding
- If the caller hangs up before any user answers, the round-robin calling must stop immediately
  - Even unanswered in-process calls to any user must immediately stop ringing  

### Account Related Features

- Each organization account will have one administrator account and multiple user accounts
- Each organization account will have its own unique main account phone number
- The administrator account can add and remove their account's users
- The administrator can send invitation emails to new users with an expiring invitation token
- Administrators and users can adjust the round-robin call order using a drag and drop web interface
- Users can adjust their own account settings (phone number, etc.)

### Techincal Requirements
- The system will use Twilio for the calling system
- Firebase and firestore will be used for the data store
- React NodeJS will be used for the front end
- Python will be used for the back end logic
