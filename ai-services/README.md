# Internal AI Services

These services run strictly on the internal Docker network and are **never exposed to the internet**.
All requests must be initiated by the backend server worker queue.

- `face-blurring/`: Automatic OpenCV / MediaPipe face obfuscation.
- `minor-detection/`: Detection of children to trigger stringent DPDP Section 9 privacy controls.
- `content-moderation/`: NSFW, violence, and hate speech filters.
- `scam-spam-detection/`: AI pattern matching for fraudulent aid requests and duplicate reports.
- `category-suggestion/`: Natural language tag suggestions based on need description.
