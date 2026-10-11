from flask import Flask, render_template, send_from_directory


app = Flask(__name__, static_folder="assets", static_url_path="/assets")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/packages")
def packages():
    return render_template("packages.html")


@app.route("/geo-ai-ads")
def geo_ai_ads():
    return render_template("geo-ai-ads.html")


@app.route("/thank-you")
def thank_you():
    return render_template("thank-you.html")


@app.route("/geo-ai-ads-thank-you")
def geo_ai_ads_thank_you():
    return render_template("geo-ai-ads-thank-you.html")


@app.route("/client/login")
def client_login():
    return render_template("client/login.html")


@app.route("/client")
def client_dashboard():
    return render_template("client/index.html")


@app.route("/admin/review")
def admin_review():
    return render_template("admin/review.html")


@app.route("/manifest.webmanifest")
def manifest():
    return send_from_directory("templates", "manifest.webmanifest")


@app.route("/robots.txt")
def robots():
    return send_from_directory("templates", "robots.txt")


@app.route("/sitemap.xml")
def sitemap():
    return send_from_directory("templates", "sitemap.xml")


@app.errorhandler(404)
def page_not_found(error):
    return render_template("404.html"), 404


if __name__ == "__main__":
    app.run(debug=True)
