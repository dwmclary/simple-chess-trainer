from flask import Flask, render_template, send_from_directory

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/node_modules/<path:filename>')
def node_modules(filename):
    return send_from_directory('node_modules', filename)

if __name__ == '__main__':
    app.run(debug=True)
