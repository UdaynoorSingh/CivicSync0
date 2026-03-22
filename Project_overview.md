# Proforma for Submitting Technical Proposal

# 3. Project Overview

## 3.1 Project Title:

## CivicSync

## 3.2 Brief Project Description:

```
The Smart Interactive Kiosk System is an all-inclusive and artificially intelligent civic service
delivery solution designed for the provision of safe and fully integrated civic services for the
general public through an interactive touch-screen interface. The system allows for citizen
authentication, provision of various civic services, payment, submission of applications and
```

```
grievance registration for tracking. The kiosk is intended to be used in a public setting like a
government office, municipal corporation office, hospital, college, and smart cities. It has both
a multi-lingual touch interface and speech-to-speech support using AI so that it is friendly to
the elderly and those who are not so conversant with technology.
```
## 3.3 Key Features & Functionalities:

- **United Civic Services Dashboard:**

## Single interface for accessing various civic services such as electricity, gas, water, sanitation,

## waste management, and other civic services.

- **Touch-Based Kiosk Interface:**

## A full-screen kiosk-mode web application that is touch-friendly and has big buttons, icons,

## and step-by-step assistance suitable for public use.

- **Speech-to-Speech AI Guidance System:**

## An AI-driven conversational RAG tool that uses smaller language models and listen and

## reply with step by step guidance to a user’s problem.

- **Multilingual User Interface:**

## Language selection at the beginning of the session with support for English, Hindi, and at

## least one regional language (mock supported).

- **Accessibility Compliance:**

## High contrast user interface, large icons, screen-reader friendly, and voice support that

## matches the norms of accessibility in the government.

- **Secure Citizen Authentication:**

## Login system based on OTP through mobile number and secure session management (JWT).

- **The Bill viewing and payment system:**

## Citizens can access their pending utility bills and make payments using UPI, Debit/Credit

## Card, or Net Banking services (simulating the integration is permitted).

- **Complaint / Grievance Registration:**

## Citizens can register their complaints by choosing the issues being raised and then generating

## a complaint number..

- **Service Requests:**

## Supported workflows for procuring a new connection for services like electricity supply, gas

## supply, water supply, etc.

- **Status Tracking:**

## Complaint resolution updates, service application statuses, and payment records tracking in

## real-time.

- **Global Map View:**

## Users and admin can explore the different areas of India to see in which place there are

## maximum number of complaint.

- **Real-Time Notifications:**

## Show service notifications, outage notices, announcements, and emergency notifications

## pushed from administrator.

- **Document Upload / Download:**

## Upload identity proofs & required documents; download receipts, certificates, service

## summaries & print documents (simulated).


- **Handling Offline / Network Failure:**

## Support for graceful failure screens during a network failure when data can be saved

## partially.

- **Auto Session Reset:**

## Auto logout for inactivity, data erasure, and “Next User” screen for protection of citizen

## privacy..

- **Admin Dashboard:**

## A separate dashboard only accessed to authority so that they can view all the complaints and

## request from the users.

# 4. Problem Understanding & Objective

## 4.1 Understanding of the Problem Statement

Civic service delivery systems often rely on manual help desks and fragmented digital platforms,
leading to long waiting lines, confusion, and inefficient service delivery. Citizens frequently face
difficulties in finding correct information regarding service procedures, documentation
requirements, payment methods, and physical service locations.
Existing digital platforms are often text-heavy, complex, or inaccessible to individuals with low
digital literacy, language barriers, or physical disabilities. Many public kiosks provide only static
information without offering actionable services such as payments, applications, or grievance
handling.
An effective kiosk system must therefore provide a self-service, user-friendly, secure, and accessible
interface that enables citizens to complete end-to-end civic tasks independently while offering
intelligent assistance when needed.

## 4.2 Objectives of the Proposed Solution

- **Increase Usability:** Design a simple and intuitive touch-based kiosk interface.
- **Enhance Accessibility:** Provide voice assistance, visual guidance, and accessibility-
    friendly design.
- **Enable Multilingual Interaction:** Support multiple regional languages.
- **Reduce Manual Dependency:** Automate common civic queries, payments, and service
    requests.
- **Provide Secure & Reliable Services:** Ensure authentication, data security, and
    accurate responses.
- **Enable Scalability & Flexibility:** Support deployment across multiple civic departments
    and locations.
- **Improve Efficiency:** Deliver faster service with minimal waiting time.

# 5. Technical Design & Architecture


## 5.1 Solution Description

The Smart Interactive Kiosk System consists of a touch-enabled kiosk device integrated with a
web-based frontend, backend services, database, and AI-powered voice assistance module.
**Frontend:**
Provides a clean, full-screen kiosk interface with large buttons, guided workflows, multilingual
support, and accessibility-friendly design. The UI allows citizens to authenticate, access
services, make payments, submit requests, and track status.
**AI Assistance Module:**
Uses speech-to-text, intent recognition, and text-to-speech pipelines with RAG enabled tool
through small and open source models. The AI listens to user queries, interprets intent, and
responds with contextual guidance in real time.
**Backend:**
A centralized backend server manages service logic, authentication, payments, complaints,
notifications, and content updates. An admin interface allows authorized personnel to manage
services, monitor usage, and push updates.
**Security:**
Implements role-based access control, secure APIs, encrypted communication, and session
handling to protect user data and system integrity.

## 5.3 Workflow & Data Flow

**1. User Approaches the Kiosk / App Launch**
    - The kiosk remains in **idle mode** , displaying a welcome screen with **visual**


**Edge Cases:**
No interaction for X seconds → kiosk returns to idle state

**2. Language Selection (Multilingual Entry Point)**
    - User selects their preferred language via: Touch (icons/text
    - Language preference is stored **temporarily for the session**.
**Edge Cases:**
    - User switches language mid-session → fallback to start of choosing language
    - Unsupported language → fallback to **English + regional default
3. OTP-Based Authentication**
    - User chooses authentication method:
       o Mobile number entry
       o Aadhaar-linked OTP (if applicable)
    - OTP is sent via SMS.
    - User enters OTP via keypad or voice dictation.
**Edge Cases:**
    - OTP not received → “Resend OTP” option with cooldown
    - Incorrect OTP entered multiple times → session locked temporarily
    - No mobile network → allow **limited guest access** (read-only services)
    - User exits before authentication → session auto-cleared
**4. Unified Service Dashboard**
    - After authentication, user sees a **simplified dashboard** :
       o Icons for major service categories (Certificates, Payments, Complaints, Status
          Tracking, etc.)
    - AI provides **guided voice assistance** explaining options.
    - Dashboard is personalized based on:
       o User profile
       o Most-used services
       o Government eligibility rules (if applicable)
**Edge Cases:**
    - User overwhelmed/confused → “Help me choose” AI option
    - Service temporarily unavailable → display reason + alternative services
    - Unauthorized service attempt → permission warning with explanation
**5. Input Method Selection (Touch / Voice / Hybrid)**
    - User can:
       o Touch buttons/forms
       o Speak naturally to the AI assistant
       o Combine both (e.g., voice + confirmation tap)
    - AI continuously guides the user step-by-step.
**Edge Cases:**


- High background noise → system suggests switching to touch mode
- Incomplete voice input → AI asks clarifying questions
- User is silent for long duration → gentle voice reminder or timeout prompt
**6. AI Processing & User Guidance**
- AI interprets:
o Voice queries
o Intent
o Context of the selected service
- AI breaks complex procedures into **micro-steps** (form filling, document upload,
confirmations).
- Real-time feedback is provided in **simple language**.
**Edge Cases:**
- Ambiguous user intent → AI asks follow-up questions
- Unsupported query → AI explains limitation and redirects
- AI confidence score low → fallback to **rule-based flows
7. Backend API Handling**
- Requests are securely sent to backend services.
- APIs handle:
o Verification
o Validation
o External government service calls
- AI waits in “processing” state with visual/audio indicators.
**Edge Cases:**
- API timeout → retry with exponential backoff
- Service server down → show expected recovery time
- Partial failure → rollback and inform user without data corruption
**8. Database Update & Retrieval**
- User actions are logged.
- Transaction status and records are saved securely.
- Previous submissions (if any) are fetched and displayed.
**Edge Cases:**
- Database write failure → transaction queued for retry
- Data mismatch → AI asks user to re-verify details
- Duplicate request → system detects and warns user
**9. Response Display & Voice Feedback**
- Final output is:
o Shown on screen (receipts, confirmation, reference number)
- Options provided:
o Print receipt


o Send SMS/email confirmation
o Start new service
**Edge Cases:**

- Printer failure → digital receipt only
- User misses information → “Repeat” option
**10. Session Completion & Auto-Reset**
- After completion or inactivity:
o Session is terminated
o User data is wiped from memory
o Kiosk resets to idle welcome screen
- Security and privacy ensured.
**Edge Cases:**
- User walks away mid-session → auto timeout
- Power/network failure → session discarded safely
- Forced shutdown → no personal data persisted locally
**11. Admin Review & Action Handling**
- After user request submission or system flagging:
- Admin views user requests on the admin dashboard
- Request status, details, and logs are displayed
- Admin takes appropriate action (approve, reject, modify, escalate)
- Backend systems are updated based on admin action
- User is notified of the action taken
**Edge Cases:**
- Admin delay or inaction → automated reminders or escalation triggered
- Incomplete or unclear user request → admin requests additional information
- Admin system downtime → requests queued and processed once restored
- Unauthorized admin access attempt → action blocked and logged securely

### IN-SHORT:

Citizen → Language → Authentication → Service Selection → Voice/Touch Interaction → AI Guidance
→ Backend Processing → Result Delivery → Secure Auto-Reset → Admin

# 6. Technical Details

## 6.1 Tools & Frameworks Used:


## Frontend :

Used to build an interactive, multilingual, voice-enabled kiosk UI with smooth user experience.

- **React.js**
    Component-based frontend framework used to create a dynamic, scalable, and responsive
    user interface for the kiosk application.
- **Framer-Motion**
    Animation library used for smooth transitions, micro-interactions, loading states, and user
    guidance animations to improve accessibility and user engagement.
- **21.dev**
    Modern frontend utilities and UI development toolkit used for rapid UI development,
    reusable components, and optimized frontend workflows.
**2. Backend Technologies**
Used to handle business logic, API orchestration, authentication, and AI coordination.
- **Node.js**
Server-side JavaScript runtime environment used to handle concurrent requests, background
processing, and integration with AI services.
- **Express.js**
Lightweight backend framework used for REST API creation, routing, middleware handling,
session management, and request validation.
- **JWT-Session**
Used for session management, secure authentication, OTP verification, and role-based access
control (user/admin).
**3. Database & Storage**
Used for secure storage, retrieval, and logging of user and admin data.
- **MongoDB-Atlas (Cloud)**
Cloud-hosted NoSQL database used to store user profiles, session metadata, service requests,
transaction logs, and admin actions.
- **Cloudinary**
Cloud-based media storage used to manage uploaded documents, images, scanned IDs, and
generated assets securely.
**4. APIs & AI Services**
Used to power voice interaction, AI guidance, and intelligent request processing.
- **Ollama-API**
Used to run and manage local small language models for intent detection, conversational
guidance, multilingual support, and offline-first AI processing.
- **OTP Gateway APIs (SMS-based)**

## Used for mobile number verification and user authentication.

- **Email / SMS Notification APIs**

## Used to send receipts, confirmations, status updates, and admin notifications.

**8. Deployment & Infrastructure**


Used for hosting, scalability, and reliability.

- **Cloud-Hosting**
    Used to host frontend, backend, and database services.
- **Docker (Optional)**
    Used for containerization of backend services and AI components.

## Hardware Components (if applicable):

- To run the local speech to speech model the user require a device with high computational
    power like a Nvidia GPU or a CPU with 16 GB minimum ram.
- We have also provided the method to resolve hardware dependency:
    Either user can use cloud based server for ai guidance or by the help of toggling button user
    can switch of the speech to speech guidance to experience a smooth interaction.

# 7. Implementation Details

## 7.1 How does the solution work?

```
The proposed solution contains a number of new features which do not exist in the existing
digital service platforms. Unlike the existing digital service platforms, which are mostly text-
based, the system is completely voice-controlled and touch-based, which can be easily used
by people who are not literate in digital technology. The platform performs switching in various
languages in real time.
```
```
An AI-assisted guidance system simplifies intricate government process steps and reduces
user confusion and dependence on external support. The system functions offline or with
limited connectivity through local languages and ensures continuous functionality in areas with
limited connectivity. Contrary to other applications, the system automatically senses user
hesitation and inactivity and assists them accordingly.
```
```
The application provides proper session privacy protection with automatic data cleanup after
each session, which is not properly maintained in existing applications. A service dashboard
provides a comprehensive interface to handle various services without having to access each
application and portal separately. The admin-assisted review process provides an opportunity
to involve human intervention in dealing with complex cases, which otherwise may take a
longer process. All such aspects help to provide an inclusive, intelligent, and reliable
```
## experience, which is not available in existing applications.

# 8. Impact & Future Scope

## 8.1 Innovation & Uniqueness

Smart Interactive Kiosk System provides an innovation to existing kiosk systems because it provides
interaction between the user and AI-based speech to speech guidance. Conventional kiosk systems
only provide text-based interaction between the user and the system, whereas Smart Interactive
Kiosk System provides interaction between the user and AI-based speech to speech interaction.


One of the major innovations that have been incorporated in the system deals with the usage of a
small language model that has the ability to interpret the intention of the user and also provide them
with contextual information in a real-time process. It thereby solves the major issue that is faced by
the civic kiosks, namely confusion among the customers because of the complexities of the process
or unfamiliarity with digital services.

In addition, the system has modular design architecture, which enables it to be updated separately
concerning the UI, backend, and AI aspects. The adoption of latest web technologies, cloud databases,
and API-based artificial intelligence frameworks provides low latency, reliability, and simplicity in
deployment. Through minimizing reliance on employees for making inquiries, this system increases
efficiency in service delivery and upgrades the experience for the public.

## 8.2 Future Improvements & Scalability:

- The future would see enhancements to the model to be capable of running on multilingual
    speech to understand and generate speech seamlessly for various languages spoken all
    around the world without the aid of translation models.
- The system has the capability of improving to completely automate handling of requests,
    where an AI system can automatically process, approve, and answer eligible requests for
    services.
- Other regional and global languages can also be included in the platform to make it universal
    and appealing to a larger audience.
- Biometric authentication techniques, such as face recognition or fingerprint recognition,
    could result in faster and more secure user authentication if integrated.

# 9. Scalability & Extensibility

```
● Modular Design
The system is broken down into separate and standalone modules like user interface, AI
guidance engine, backend processing, and database management. Each of these modules can
be developed or upgraded or even replaced independently.
```
```
● Multi-department Integration
The kiosk system has an architecture that makes it possible to integrate with multiple civic
departments via standardized APIs. Each civic department, such as civic services, healthcare,
education, and transportation, has the ability to publish its services and data to the kiosk
system, making it possible for citizens to interact with various services from one platform.
The kiosk system provides role-based access to manage specific data from different civic
departments
```
```
● Future Service Expansion Support
The dynamic backend and cloud infrastructure enable seamless extensions in the provision
of other services such as online applications, scheduling appointments, payment processing,
and tracking the status in real-time. The AI parts can then be enabled for future-proofing in
matters related to conversational AI through personalization and prediction.
```

# 10. Security & Compliance

## Aspect Description

## User Authentication Secure user authentication using multi-factor mechanisms

## such as Aadhaar-based OTP, mobile OTP, or authorized

## credentials. Role-based access control (RBAC) ensures only

## permitted users can access specific services and

## administrative functions.

## Data Privacy All personal and sensitive user data is encrypted during

## storage and transmission. The system follows data

## minimization principles and ensures that no unnecessary

## personal data is stored. User consent is obtained before

## processing any personal information.

## Compliance with Govt. IT / DPDP Act The system complies with Government of India IT guidelines

## and the Digital Personal Data Protection (DPDP) Act, ensuring

## lawful data collection, processing, storage, and deletion.

## Regular security audits and policy adherence are maintained.

Secure Transactions (^) All transactions are conducted over secure HTTPS channels using SSL/TLS encryption.

## Transaction logs are maintained for audit purposes, and safeguards are implemented to

## prevent unauthorized access, tampering, and data breaches.^

# 11. Declaration

## We hereby declare that the information provided in this technical proposal is true and

## correct to the best of our knowledge. The proposed solution is our original work and does

## not violate any intellectual property rights.
