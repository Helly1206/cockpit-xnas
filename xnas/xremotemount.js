/*********************************************************
 * SCRIPT : xremotemount.js                              *
 *          Javascript for xnas Cockpit web-gui          *
 *          (xremotemount)                               *
 *          I. Helwegen 2020                             *
 *********************************************************/

class xremotemount {
    constructor(el) {
        this.el = el;
        this.name = "xremotemount";
        this.pane = new tabPane(this, el, this.name);
        this.dropdownContent = [
            {name : "Mount", disable: "mounted", disableValue: true, callback: this.mount},
            {name : "Unmount", disable: "mounted", disableValue: false, callback: this.unmount},
            {name : "Clear", disable: "referenced", disableValue: true, callback: this.clear},
            {name : "Delete", disable: "referenced", disableValue: true, callback: this.delete}
        ];
        this.fsTypes = ["cifs", "davfs", "nfs", "nfs4"];
        this.xremotemounts = [];
    }

    displayContent(el) {
        this.displayXremotemounts();
    }

    displayXremotemounts(el) {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's';
        this.pane.addButton("add", "Add", this.addXremotemount, true, false, false);
        this.pane.addButton("lst", "List", this.displayList, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.pane.getTable().setDropDown(this.dropdownContent);
        this.getXremotemounts();
    }

    displayList() {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': list (mountable remote devices)';
        this.pane.addButton("xmnt", "Xremotemounts", this.displayXremotemounts, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.getLst();
    }

    getXremotemounts() {
        var cb = function(data) {
            var lData = JSON.parse(data);
            this.xmounts = [];
            lData.forEach(datum => {
                //datum['!candisable'] = ((datum.enabled) && (!datum.referenced));
                this.xmounts.push(datum.xmount);
            });
            this.pane.getTable().setData(lData);
        };
        runCmd.call(this, this.name, cb, [], ["--human"]);
    }

    getLst() {
        var cb = function(data) {
            this.pane.getTable().setData(JSON.parse(data));
        };
        runCmd.call(this, this.name, cb, ["lst"]);
    }

    tableClickCallback(data) {
        var cbEdit = function(jData) {
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            this.buildEditDialog(data.xremotemount, JSON.parse(jData));
        }
        if (("xremotemount" in data) && (data.xremotemount != "-")) {
            this.pane.showSpinner();
            runCmd.call(this, this.name, cbEdit, ["shw", data.xremotemount], ["--human"]);
        } else {
            this.addXremotemount(data);
        }
    }

    buildEditDialog(xname, aData) {
        var fstypeChangedCallback = function(param, fstype) {
            dialog.updateData([{
                param: "https",
                disabled: (fstype != "davfs")
            }]);
        };
        var usernameChangedCallback = function(param, username) {
            dialog.updateData([{
                param: "password",
                disabled: (!username)
            }]);
        };
        var methodChangedCallback = function(param, method) {
            if (method == "auto" && aData.idletimeout == 0) {
                aData.idletimeout = 30;
            }
            dialog.updateData([{
                param: "idletimeout",
                value: aData.idletimeout,
                disabled: (method != "auto")
            }]);
        };
        var dlgData = [{
                param: "https",
                text: "Https server",
                value: aData.https,
                type: "boolean",
                disabled: (aData.type != "davfs"),
                readonly: false,
                comment: "Use secure mount (ssl) for Davfs"
            }, {
                param: "server",
                text: "Server address",
                value: aData.server,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Server for remote mount"
            }, {
                param: "sharename",
                text: "Sharename",
                value: aData.sharename,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Sharename for remote mount"
            }, {
                param: "mountpoint",
                text: "Mountpoint",
                value: aData.mountpoint,
                type: "file",
                disabled: false,
                readonly: false,
                alttext: "Select or create mountpoint",
                filedir: true,
                filesave: false,
                fileaddnew: true,
                filetextedit: false,
                filebase: "/",
                filerelative: false,
                comment: "Link to accessible location of Xmount on disk"
            }, {
                param: "type",
                text: "Filesystem type",
                value: aData.type,
                type: "select",
                opts: this.fsTypes,
                disabled: (xname),
                readonly: false,
                onchange: fstypeChangedCallback,
                comment: "Filesystem type for this Xremotemount"
            }, {
                param: "options",
                text: "Options",
                value: aData.options,
                type: "multi",
                disabled: false,
                readonly: false,
                comment: "Special options for this filesystem"
            }, {
                param: "rw",
                text: "Mount read/ write",
                value: aData.rw,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Mount this filesystem with write permissions"
            }, {
                param: "freq",
                text: "Dump filesystem",
                value: aData.freq,
                type: "number",
                min: 0,
                max: 1,
                step: 1,
                disabled: false,
                readonly: false,
                comment: "Filesystem dump (0 = disabled or 1, obsolete)"
            }, {
                param: "pass",
                text: "Mount order",
                value: aData.pass,
                type: "number",
                min: 0,
                max: 2,
                step: 1,
                disabled: false,
                readonly: false,
                comment: "Filesystem mount order (0 = disable checking, 1 = root devices, 2 =other devices)"
            }, {
                param: "uacc",
                text: "User access level",
                value: access2string(aData.uacc),
                type: "select",
                opts: ["none", "read", "read/write"],
                disabled: false,
                readonly: false,
                comment: "Access level for normal users (non superusers)"
            }, {
                param: "sacc",
                text: "Superuser access level",
                value: access2string(aData.sacc),
                type: "select",
                opts: ["none", "read", "read/write"],
                disabled: false,
                readonly: false,
                comment: "Access level for superusers"
            }, {
                param: "username",
                text: "Username",
                value: aData.username,
                type: "text",
                disabled: false,
                readonly: false,
                onchange: usernameChangedCallback,
                comment: "Login username for remote mount"
            }, {
                param: "password",
                text: "Password",
                value: aData.password,
                type: "password",
                comment: "mycomment",
                disabled: (!aData.username),
                readonly: false,
                comment: "Login password for remote mount (if left empty, password is not changed)"
            }, {
                param: "method",
                text: "Mount method",
                value: aData.method,
                type: "select",
                opts: ["disabled", "startup", "auto", "dynmount"],
                disabled: false,
                readonly: false,
                comment: "Mount method for this Xremotemount",
                onchange: methodChangedCallback,
            }, {
                param: "idletimeout",
                text: "Idle timeout",
                value: aData.idletimeout,
                type: "number",
                min: 0,
                max: 32767,
                step: 1,
                disabled: (aData.method != "auto"),
                readonly: false,
                comment: "Unmount automount when idle for timeout seconds (default = 30)"
            }, {
                param: "timeout",
                text: "Timeout",
                value: aData.timeout,
                type: "number",
                min: 0,
                max: 32767,
                step: 1,
                disabled: false,
                readonly: false,
                comment: "Mount timeout in seconds (default = 10)"
            }
        ];
        var title = "";
        if (xname == null) {
            let name = generateUniqueName(this.xremotemounts, "myRemotemount");
            dlgData.splice(0, 0, {
                param: "xremotemount",
                text: "Xremotemount",
                value: name,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Enter a unique name for the Xremotemount here"
            });
            title = "Add Xremotemount";
        } else {
            title = "Edit Xremotemount: " + xname;
        }
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            rData.sacc = string2access(rData.sacc);
            rData.uacc = string2access(rData.uacc);
            this.addEdit(rData, xname, aData);
        }
        dialog.build(title, dlgData, cbOk);
    }

    /*
    -t, --https      : davfs use https <boolean> (default = True) (add)
-s, --server     : server for remote mount <string> (add)
-S, --sharename  : sharename for remote mount <string> (add)
-m, --mountpoint : mountpoint <string> (add)
-T, --type       : type <string> (davfs, cifs, nfs or nfs4) (add)
-o, --options    : extra options, besides _netdev <string> (add)
-a, --auto       : mount auto <boolean> (add)
-r, --rw         : mount rw <boolean> (add)
-f, --freq       : dump value <value> (add)
-p, --pass       : mount order <value> (add)
-u, --uacc       : users access level (,r,w) (default = rw) (add)
-A, --sacc       : superuser access level (,r,w) (default = rw) (add)
-U, --username   : remote mount access username (guest if omitted) (add)
-P, --password   : remote mount access password (add)
-d, --dyn        : dynamically mount when available <boolean> (add)
    */
    buildAddData(data) {
        var editData = {};

        if ((data != null) && ("type" in data)) {
            if ("https" in data) {
                editData.https = data.https;
            } else {
                editData.https = true;
            }
            editData.server = data.server;
            editData.sharename = data.sharename;
            editData.mountpoint = data.mountpoint;
            editData.type = data.type;
            editData.options = cs2arrFilter(data.options, getDefopts());
            editData.rw = !data.options.includes("ro");
            editData.ssd = data.options.includes("noatime");
            editData.freq = data.dump;
            editData.pass = data.pass;
            if (!data.options.includes("noauto")) {
                editData.method = "startup";
                editData.idletimeout = 0;
            } else {
                if (data.options.includes("x-systemd.automount")) {
                    editData.method = "auto";
                    if (data.options.includes("x-systemd.idle-timeout")) {
                        editData.idletimeout = csGetVal(data.options, "x-systemd.idle-timeout");
                    } else {
                        editData.idletimeout = 30;
                    }
                } else {
                    editData.method = "disabled";
                    editData.idletimeout = 0;
                }
            }
            if (data.options.includes("x-systemd.mount-timeout")) {
                editData.timeout = csGetVal(data.options, "x-systemd.mount-timeout");
            } else {
                editData.timeout = 10;
            }
        } else {
            editData.https = true;
            editData.server = "";
            editData.sharename = "";
            editData.mountpoint = "/mnt/" + generateUniqueName(this.xremotemounts, "myRemotemount");
            editData.type = "cifs";
            editData.options = [];
            //editData.auto = true;
            editData.rw = true;
            editData.ssd = true;
            editData.freq = 0;
            editData.pass = 0;
            editData.method = "auto";
            editData.idletimeout = 30;
            editData.timeout = 10;
        }

        editData.uacc = "rw";
        editData.sacc = "rw";
        editData.username = "";
        editData.password = "";

        return editData;
    }

    addXremotemount(data = null) {
        this.pane.showSpinner();
        var editData = this.buildAddData(data);
        this.pane.getTable().loadingDone();
        this.pane.disposeSpinner();
        this.buildEditDialog(null, editData);
    }

    addEdit(data, xname, aData) {
        var addXremotemount = false;
        var opts = [];
        if ("xremotemount" in data) {
            xname = data.xremotemount;
            addXremotemount = true;
            aData = {};
        }
        opts = buildOpts(data, aData, ["xremotemount"]);
        if (xname) {
            if ((addXremotemount) && (this.xremotemounts.includes(xname))) {
                new msgBox(this, "Existing Xremotemount name " + xname, "Please enter a unique name for the Xremotemount");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to Xremotemount", "Xremotemount not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayXremotemounts, ["add", xname], opts);
                };
                var txt = "";
                if (addXremotemount) {
                    txt = "Are you sure to add " + xname + " as Xremotemount?";
                } else {
                    txt = "Are you sure to edit " + xname + " as Xremotemount?";
                }
                new confirmDialog(this, "Add/ edit Xremotemount " + xname, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty Xremotemount name", "Please enter a valid name for the Xremotemount");
        }
    }

    mount(data) {
        var cbYes = function() {
            this.pane.showSpinner("Mounting...");
            runCmd.call(this, this.name, this.getXremotemounts, ["mnt", data.xremotemount]);
        };
        var txt = "Are you sure to mount " + data.xremotemount + "?";
        new confirmDialog(this, "Mount " + data.xremotemount, txt, cbYes);
    }

    unmount(data) {
        var cbYes = function() {
            this.pane.showSpinner("Unmounting...");
            runCmd.call(this, this.name, this.getXremotemounts, ["umnt", data.xremotemount]);
        };
        var txt = "Are you sure to unmount " + data.xremotemount + "?";
        new confirmDialog(this, "Unmount " + data.xremotemount, txt, cbYes);
    }

    /*
    enable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Enabling...");
            runCmd.call(this, this.name, this.getXremotemounts, ["ena", data.xremotemount]);
        };
        var txt = "Are you sure to enable " + data.xremotemount + "?" + "<br>" +
                    "This item will automatically mount during startup!"
        new confirmDialog(this, "Enable " + data.xremotemount, txt, cbYes);
    }

    disable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Disabling...");
            runCmd.call(this, this.name, this.getXremotemounts, ["dis", data.xremotemount]);
        };
        var txt = "Are you sure to disable " + data.xremotemount + "?" + "<br>" +
                    "This item will not automatically mount during startup!"
        new confirmDialog(this, "Disable " + data.xremotemount, txt, cbYes);
    }
    */

    clear(data) {
        var cbYes = function() {
            this.pane.showSpinner("clearing...");
            runCmd.call(this, this.name, this.getXremotemounts, ["clr", data.xremotemount]);
        };
        var txt = "Are you sure to clear " + data.xremotemount + "?" + "<br>" +
                    "This item will be deleted from database but not from fstab!"
        new confirmDialog(this, "Clear " + data.xremotemount, txt, cbYes);
    }

    delete(data) {
        var cbYes = function() {
            this.pane.showSpinner("Deleting...");
            runCmd.call(this, this.name, this.getXremotemounts, ["del", data.xremotemount]);
        };
        var txt = "Are you sure to delete " + data.xremotemount + "?" + "<br>" +
                    "This item will be deleted from database and fstab!";
        new confirmDialog(this, "Delete " + data.xremotemount, txt, cbYes);
    }
}
