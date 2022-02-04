import logging
from flask import Flask, Response, redirect, render_template, request, url_for, flash
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

joinmarketwebui_enpoint = JoinmarketwebuiService.blueprint
CORS()

@joinmarketwebui_enpoint.route("/index.html")
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
