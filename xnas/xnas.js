/*********************************************************
 * SCRIPT : xnas.js                                      *
 *          Javascript for xnas Cockpit web-gui          *
 *                                                       *
 *          I. Helwegen 2020                             *
 *********************************************************/

// now add a function to fill the contents of the tab pane, based on the selection. --> Done
// The contents is added in the specific js file --> Done
// xnas-common translates a json table to content to display/ edit a table --> Done
// Editing a table is a callback to the caller.
// <!-- every div has a panel heading (info/ buttons) and table or textfield for log -->

function clickTab() {
    // remove active class from all elements
    document.querySelectorAll('[role="presentation"]').forEach(function (el) {
        el.classList.remove("active");
        el.getElementsByTagName("a")[0].setAttribute("tabindex", -1);
        el.getElementsByTagName("a")[0].setAttribute("aria-selected", false);
    });

    // add class 'active' to this element
    this.classList.add("active")
    this.getElementsByTagName("a")[0].setAttribute("aria-selected", true);
    this.getElementsByTagName("a")[0].removeAttribute("tabindex");

    // hide all contents
    document.querySelectorAll('[role="tabpanel"]').forEach(function (el) {
        el.setAttribute("aria-hidden", true);
        el.classList.remove("active");
        el.classList.remove("in");
    });

    // show current contents
    contentId = this.getElementsByTagName("a")[0].getAttribute("aria-controls");
    el = document.getElementById(contentId);

    el.setAttribute("aria-hidden", false);
    el.classList.add("active");
    el.classList.add("in");
    displayContent(el);
}

function displayContent(el) {
    if (el.id.search("xmount") >= 0) {
        let Xmount = new xmount(el);
        Xmount.displayContent();
    } else if (el.id.search("xremotemount") >= 0) {
        let Xremotemount = new xremotemount(el);
        Xremotemount.displayContent();
    } else if (el.id.search("xshare") >= 0) {
        let Xshare = new xshare(el);
        Xshare.displayContent();
    } else if (el.id.search("xnetshare") >= 0) {
        let Xnetshare = new xnetshare(el);
        Xnetshare.displayContent();
    } else if (el.id.search("dynmount") >= 0) {
        let Dynmount = new dynmount(el);
        Dynmount.displayContent();
    } else if (el.id.search("log") >= 0) {
        let Logger = new logger(el, "/var/log/xnas.log");
        Logger.displayContent();
    } else if (el.id.search("settings") >= 0) {
        let Settings = new settings(el);
        Settings.displayContent();
    }
}

function displayFirstPane() {
    displayContent(document.querySelectorAll('[role="tabpanel"]')[0]);
}

document.querySelectorAll('[role="presentation"]').forEach(function (el) {
    el.addEventListener("click", clickTab);
});

displayFirstPane();

// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() { });

////////////////////
// Common classes //
////////////////////

class dynmount {
    constructor(el) {
        this.el = el;
        this.name = "dynmount";
        this.pane = new tabPane(this, el, this.name);
    }

    displayContent(el) {
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's';
        this.pane.getTable().setClickable(false);
        this.getDynmounts();
    }

    getDynmounts() {
        var cb = function(data) {
            this.pane.getTable().setData(JSON.parse(data));
        }
        runCmd.call(this, 'xnas', cb, ['srv'], ["--show"]);
    }
}

class settings {
    constructor(el) {
        this.el = el;
        this.name = "settings";
        this.pane = new tabPane(this, el, this.name);
        this.update = [];
        this.btnUpdate = null;
        this.btnCheck = null;
        this.btnFix = null;
        this.cancheck = true;
        this.canfix = false;
    }

    displayContent(el) {
        this.displaySettings();
        this.getSettings();
    }

    displaySettings(text = "") {
        this.pane.build(text, true);
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1);
        this.btnUpdate = this.pane.addButton("Update", "Update", this.btnUpdateCallback, true, (this.update.length == 0), false);
        this.btnCheck = this.pane.addButton("Check", "Check", this.btnCheckCallback, false, !this.cancheck, false);
        this.btnFix = this.pane.addButton("Fix", "Fix", this.btnFixCallback, false, !this.canfix, false);
    }

    displayCheck() {
        this.pane.build();
        this.pane.getTitle().innerHTML = "Check";
        this.pane.addButton("Settings", "Settings", this.btnSettingsCallback, false, false, false);
        this.btnFix = this.pane.addButton("Fix", "Fix", this.btnFixCallback, false, !this.canfix, false);
        this.pane.getTable().setClickable(false);
    }

    displayFix() {
        this.pane.build();
        this.pane.getTitle().innerHTML = "Fix";
        this.pane.addButton("Settings", "Settings", this.btnSettingsCallback, false, false, false);
        this.btnCheck = this.pane.addButton("Check", "Check", this.btnCheckCallback, false, !this.cancheck, false);
        this.pane.getTable().setClickable(false);
    }

    getSettings(callback) {
        var cb = function(data) {
            this.cancheck = true;
            this.canfix = false;
            this.pane.setButtonDisabled(this.btnCheck, !this.cancheck);
            this.pane.setButtonDisabled(this.btnFix, !this.canfix);
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
            var iData = JSON.parse(data);
            var oData = {};
            for (var key in iData) {
                oData[key.replace("srv","").replace("dyn","").replace("autofix","af")] = iData[key];
            }
            this.buildEditForm(oData);
        }
        this.update = [];
        runCmd.call(this, 'xnas', cb, ['srv'], ["--settings"]);
    }

    getCheck() {
        var cb = function(data) {
            var aData = JSON.parse(data);
            if (aData.length > 0) {
                this.cancheck = false;
                this.canfix = true;
                this.pane.setButtonDisabled(this.btnCheck, !this.cancheck);
                this.pane.setButtonDisabled(this.btnFix, !this.canfix);
            }
            this.pane.getTable().setData(aData);
        }
        runCmd.call(this, 'xnas', cb, ['chk'], []);
    }

    getFix() {
        var cb = function(data) {
            var aData = JSON.parse(data);
            if (aData.length > 0) {
                this.cancheck = true;
                this.canfix = false;
                this.pane.setButtonDisabled(this.btnCheck, !this.cancheck);
                this.pane.setButtonDisabled(this.btnFix, !this.canfix);
            }
            this.pane.getTable().setData(JSON.parse(data));
        }
        runCmd.call(this, 'xnas', cb, ['fix'], []);
    }

    buildEditForm(aData) {
        var settingsCallback = function(param, value) {
            this.update = buildOpts(this.pane.getSettingsEditForm().getData(), aData);
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
        }
        //{"srvenable": true, "dyninterval": 60, "dynzfshealth": true, "dynremovable": true}
        var dlgData = [{
                param: "enable",
                text: "Enable xservices",
                value: aData.enable,
                type: "boolean",
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Enables or disable xservices"
            }, {
                param: "interval",
                text: "Dynmount interval [s]",
                value: aData.interval,
                type: "number",
                min: 0,
                max: 3600,
                step: 1,
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Dynmount database reloading interval"
            }, {
                param: "zfshealth",
                text: "Dynmount zfs health",
                value: aData.zfshealth,
                type: "boolean",
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Dynmount disables degraded ZFS pools"
            }, {
                param: "removable",
                text: "Dymount removable",
                value: aData.removable,
                type: "boolean",
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Dynmount dynamically mount devices not in fstab"
            }, {
                param: "afenable",
                text: "Enable autofix",
                value: aData.afenable,
                type: "boolean",
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Enables or disables autofix of errors during startup"
            }, {
                param: "afretries",
                text: "Autofix retries",
                value: aData.afretries,
                type: "number",
                min: 0,
                max: 10000,
                step: 1,
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Number of autofix retries (0 = unlimited)"
            }, {
                param: "afinterval",
                text: "Autofix interval [s]",
                value: aData.afinterval,
                type: "number",
                min: 0,
                max: 3600,
                step: 1,
                onchange: settingsCallback,
                disabled: false,
                readonly: false,
                comment: "Autofix retry interval"
            }
        ];
        this.pane.getSettingsEditForm().setData(dlgData);
    }

    btnSettingsCallback() {
        this.pane.dispose();
        this.displaySettings();
        this.getSettings();
    }

    btnUpdateCallback() {
        var cbYes = function() {
            this.pane.dispose();
            this.displaySettings("Updating settings...");
            runCmd.call(this, 'xnas', this.getSettings, ['srv'], this.update);
        };
        if (this.update.length > 0) {
            var txt = "Are you sure to update settings and restart XNAS services?"
            new confirmDialog(this, "Update settings", txt, cbYes);
        } else {
            new msgBox(this, "No settings changed", "No update required!");
        }
    }

    btnCheckCallback() {
        this.pane.dispose();
        this.displayCheck();
        this.getCheck();
    }

    btnFixCallback() {
        this.pane.dispose();
        this.displayFix();
        this.getFix();
    }
}

/////////////////////
// Common functions //
//////////////////////

function runCmd(cmd, callback, args = [], opts = [], json = "") {
    var cbDone = function(data) {
        callback.call(this, data);
    };
    var cbFail = function(message, data) {
        callback.call(this, "[]");
        new msgBox(this, "Xnas command failed", "Command error: " + (data ? noAnsi(data) : message + "<br>Please check the log file"));
    };
    var command = [cmd];
    command = command.concat(args);
    command = command.concat(opts);
    if (json) {
        command = command.concat(json);
    }
    command = command.concat("--json");
    return cockpit.spawn(command, { err: "out", superuser: "require" })
        .done(cbDone.bind(this))
        .fail(cbFail.bind(this));
}

function noAnsi(data) {
    return data.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

function buildOpts(data, refData = {}, exclude = []) {
    var opts = [];

    for (let key in data) {
        let addKey = true;
        if (exclude.includes(key)) {
            addKey = false;
        } else if (key in refData) {
            if (data2str(data[key]) == data2str(refData[key])) {
                addKey = false;
            }
        }
        if (addKey) {
            opts.push("--" + key);
            if (data[key] != null) {
                opts.push(data2str(data[key]));
            }
        }
    }
    return opts;
}

function data2str(data) {
    var str = "";
    if (Array.isArray(data)) {
        str = data.map(s => s.trim()).join(",");
    } else {
        str = data.toString();
    }
    return str;
}

function cs2arr(data, force = true) {
    var arr = [];
    if ((force) || (data.includes(","))) {
        arr = data.split(",").map(s => s.trim());
    } else {
        arr = Array.from(data);
    }

    return arr;
}

function cs2arrFilter(data, fltr = []) {
    var retarr = [];
    var arr = cs2arr(data);

    arr.forEach(datum => {
        let delItem = false;
        fltr.forEach(tag => {
            if (datum.includes(tag)) {
                delItem = true;
            }
        });
        if (!delItem) {
            retarr.push(datum)
        }
    });
    return retarr;
}

function getDefopts() {
    return ["auto","noauto","rw","ro","atime","noatime","diratime","nodiratime","_netdev",
            "x-systemd.automount","x-systemd.idle-timeout","x-systemd.mount-timeout",
            "dir_mode", "file_mode", "umask"];
}

function csGetVal(data, tag = "") {
    var val = 0;
    var arr = cs2arr(data);

    arr.forEach(datum => {
        if (datum.includes(tag)) {
            var arr2 = [];
            arr2 = data.split("=").map(s => s.trim());
            if (arr2.length > 1) {
                val = parseInt(arr2[1]);
            }
        }
    });
    return val;
}

function generateUniqueName(list, value, value2 = "", value3 = "") {
    var name = "";
    var pname = "";
    var value4 = "";
    var i = 1;

    if (value) {
        name = decodeName(value);
        value4 = value.substring(0, value.lastIndexOf('/')).replaceAll("/","")
    }

    if ((!name) || (list.includes(name))) {
        if (value2) {
            name = decodeName(value2);
        }
    }

    if ((!name) || (list.includes(name))) {
        if (value3) {
            name = decodeName(value3);
        }
    }

    if (!name) {
        name = randomString();
    } else if (list.includes(name)) {
        if (value4) {
            name = value4 + name;
        }
    }

    pname = name;

    while (list.includes(name)) {
        name = pname + i.toString();
        i++;
    }

    return name;
}

function decodeName(value) {
    var name = "";

    if (value == "/") {
        name = "_root_";
    } else {
        name = value.substring(value.lastIndexOf('/') + 1);
    }

    return name;
}

function randomString(stringLength = 8) {
    var result           = '';
    var characters       = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for ( var i = 0; i < stringLength; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function access2string(aData) {
    var accStr = "none";
    if (aData == "rw") {
        accStr = "read/write";
    } else if (aData == "r") {
        accStr = "read";
    }
    return accStr;
}

function string2access(strData) {
    var acc = "";
    if (strData == "read/write") {
        acc = "rw";
    } else if (strData == "read") {
        acc = "r";
    }
    return acc;
}
