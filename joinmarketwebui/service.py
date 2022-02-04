from cryptoadvance.specter.services.service import Service, devstatus_alpha


class JoinmarketwebuiService(Service):
    id = "joinmarketwebui"
    name = "Joinmarket WebUI"
    icon = "mstile-310x310.png"
    logo = "mstile-70x70.png"
    desc = "A WebUI for joinmarket."
    has_blueprint = True
    blueprint_module = "joinmarketwebui.controller"
    devstatus = devstatus_alpha

    # TODO: As more Services are integrated, we'll want more robust categorization and sorting logic
    sort_priority = 2