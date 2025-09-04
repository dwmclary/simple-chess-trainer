# Simple Chess Trainer

A simple web application for chess training.

## Features

- Interactive chessboard
- Move validation
- Responsive design

## Getting Started

### Prerequisites

- Python 3
- Node.js and npm

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/dwmclary/simple-chess-trainer.git
   ```
2. Create a virtual environment and activate it:
   ```sh
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```
4. Install the Node.js dependencies:
   ```sh
   npm install
   ```

## Usage

Run the Flask application:

```sh
python app.py
```

Open your web browser and navigate to `http://127.0.0.1:5000`.

## Deployment on Google Cloud Run

To deploy this application to Google Cloud Run, you'll need the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and [Docker](https://www.docker.com/products/docker-desktop/) installed and configured.

1.  **Build the Docker container:**
    Replace `[PROJECT_ID]` with your Google Cloud Project ID and `[APP_NAME]` with a name for your app (e.g., `simple-chess-trainer`).
    ```bash
    docker build -t gcr.io/[PROJECT_ID]/[APP_NAME] .
    ```

2.  **Push the container to Google Container Registry (GCR):**
    First, configure Docker to authenticate with GCR:
    ```bash
    gcloud auth configure-docker
    ```
    Then, push the image:
    ```bash
    docker push gcr.io/[PROJECT_ID]/[APP_NAME]
    ```

3.  **Deploy to Cloud Run:**
    This command will deploy your container image to Cloud Run. You'll be prompted to choose a region.
    ```bash
    gcloud run deploy [APP_NAME] \
      --image gcr.io/[PROJECT_ID]/[APP_NAME] \
      --platform managed \
      --allow-unauthenticated
    ```

## Built With

- [Flask](https://flask.palletsprojects.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [cm-chessboard](https://github.com/shaack/cm-chessboard)
- [chess.js](https://github.com/jhlywa/chess.js)