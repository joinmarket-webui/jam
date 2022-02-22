import logging
from flask import Flask, Response, redirect, render_template, request, url_for, flash, make_response
from flask_login import login_required


from cryptoadvance.specter.util.common import str2bool
from cryptoadvance.specter.services.controller import user_secret_decrypted_required
from .service import JoinmarketwebuiService


from flask import Flask, send_from_directory, request
from flask_cors import CORS
import os
import requests


"""
    Empty placeholder just so the dummyservice/static folder can be wired up to retrieve its img
"""

logger = logging.getLogger(__name__)

joinmarketwebui_endpoint = JoinmarketwebuiService.blueprint
CORS()

@joinmarketwebui_endpoint.route("/index.html")
def index():

    embed = str2bool(request.args.get('embed'))
    if not embed:
        return render_template(
            "joinmarketwebui/index.html", embed = True
        )
    else:
        return render_template(
            "joinmarketwebui/index_embedded.jinja", emded=False
        )



@joinmarketwebui_endpoint.route("/api/<path:mypath>", methods=["GET", "POST"])
def vaultoro_proxy(mypath):
    logger.debug(f"Proxy {mypath}")
    url = "https://localhost:28183/" + mypath
    logger.debug(f"VTProxy {url}")
    # Not sure what about request.data ... irgnore it for now
    session = requests.session()
    newheaders = {
        "sometoken": request.headers["VTOKEN"],
        "Content-type": "application/json",
    }
    resp = session.request(
        request.method,
        url,
        params=request.args,
        stream=False,
        headers=newheaders,
        allow_redirects=True,
        # cookies=request.cookies,
        data=request.data,
    )

    if resp.status_code != 200:
        logger.error(f"VTProxy: status-code {resp.status_code} for request {url}")
    # A Flask/Werkzeug Response is very different from a requests-response
    # So we need to create one manually.
    f_resp = make_response(resp.content, resp.status_code)  # resp.headers.items())
    # Would love to have a generic cookie-handling here but i can't figure out
    # how to reasonably iterate over a RequestsCookieJar respecting paths, domains etc.
    # for cookie in resp.cookies:
    #    print("cookiename: {}expires: {}".format(cookie.name, cookie.expires))
    #    f_resp.set_cookie(cookie.name, value=resp.cookies.get(cookie.name),
    #        path=cookie.path, domain=cookie.domain  )
    return f_resp
