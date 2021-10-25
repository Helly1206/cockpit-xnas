/*********************************************************
 * SCRIPT : xnetshare.js                                 *
 *          Javascript for xnas Cockpit web-gui          *
 *          (xnetshare)                                  *
 *          I. Helwegen 2020                             *
 *********************************************************/

class xnetshare {
    constructor(el) {
        this.el = el;
        this.name = "xnetshare";
        this.pane = new tabPane(this, el, this.name);
        this.update = [];
        this.btnUpdate = null;
        this.dropdownContent = [
            {name : "Privileges", disable: "!hasprivs", disableValue: false, callback: this.CifsPrivs},
            {name : "Enable", disable: "!canenable", disableValue: false, callback: this.enable},
            {name : "Disable", disable: "!candisable", disableValue: false, callback: this.disable},
            {name : "Delete", disable: "!candelete", disableValue: false, callback: this.delete}
        ];
        this.UsersDropdownContent = [
            {name : "Delete", disable: null, disableValue: null, callback: this.CifsUsrDelete}
        ];
        this.types = ["cifs", "nfs"];
        this.xnetshares = [];
        this.users = [];
        this.prvUsers = [];
    }

    displayContent(el) {
        this.displayXnetshares();
    }

    displayXnetshares(el) {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's';
        this.pane.addButton("add", "Add", this.addXnetshare, true, false, false);
        this.pane.addButton("nfs", "NFS config", function(){this.displayNfsConfig();this.getNfsSettings();}.bind(this), false, false, false);
        this.pane.addButton("cifs", "CIFS config", function(){this.displayCifsConfig();this.getCifsSettings();}.bind(this), false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.pane.getTable().setDropDown(this.dropdownContent);
        this.getXnetshares();
    }

    displayNfsConfig(text = "") {
        this.pane.dispose();
        this.pane.build(text, true);
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': NFS configuration';
        this.pane.addButton("xnsh", "Xnetshares", this.displayXnetshares, false, false, false);
        this.btnUpdate = this.pane.addButton("upd", "Update", this.updateNfs, true, (this.update.length == 0), false);
        this.pane.addButton("rfr", "Refresh", this.refreshNfs, true, false, false);
        this.pane.addButton("clr", "Clear", this.clearNfs, true, false, false);
    }

    displayCifsConfig(text = "") {
        this.pane.dispose();
        this.pane.build(text, true);
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': CIFS configuration';
        this.pane.addButton("xnsh", "Xnetshares", this.displayXnetshares, false, false, false);
        this.pane.addButton("hms", "Homes", function(){this.displayCifsHomes();this.getCifsHomes();}.bind(this), false, false, false);
        this.pane.addButton("usr", "Users", this.displayCifsUsers, false, false, false);
        this.btnUpdate = this.pane.addButton("upd", "Update", this.updateCifs, true, (this.update.length == 0), false);
        this.pane.addButton("rfr", "Refresh", this.refreshCifs, true, false, false);
        this.pane.addButton("clr", "Clear", this.clearCifs, true, false, false);
    }

    displayCifsHomes(text = "") {
        this.pane.dispose();
        this.pane.build(text, true);
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': CIFS homes configuration';
        this.pane.addButton("xnsh", "Xnetshares", this.displayXnetshares, false, false, false);
        this.pane.addButton("cifs", "CIFS config", function(){this.displayCifsConfig();this.getCifsSettings();}.bind(this), false, false, false);
        this.pane.addButton("usr", "Users", this.displayCifsUsers, false, false, false);
        this.btnUpdate = this.pane.addButton("upd", "Update", this.updateCifsHomes, true, (this.update.length == 0), false);
        this.pane.addButton("rfr", "Refresh", this.refreshCifs, true, false, false);
    }

    displayCifsUsers(el) {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': CIFS users configuration';
        this.pane.addButton("xnsh", "Xnetshares", this.displayXnetshares, false, false, false);
        this.pane.addButton("cifs", "CIFS config", function(){this.displayCifsConfig();this.getCifsSettings();}.bind(this), false, false, false);
        this.pane.addButton("hms", "Homes", function(){this.displayCifsHomes();this.getCifsHomes();}.bind(this), false, false, false);
        this.pane.addButton("add", "Add", this.addCifsUser, true, false, false);
        this.pane.addButton("rfr", "Refresh", this.refreshCifs, true, false, false);
        this.pane.getTable().setOnClick(this.usersTableClickCallback);
        this.pane.getTable().setDropDown(this.UsersDropdownContent);
        this.getCifsUsers();
    }

    displayCifsPrivs(el, xname) {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': CIFS privileges for ' + xname;
        this.pane.addButton("xnsh", "Xnetshares", this.displayXnetshares, false, false, false);
        this.pane.addButton("add", "Add", function(){this.addCifsPriv(xname);}, true, false, false);
        this.pane.getTable().setOnClick(function(data){this.prvTableClickCallback(data, xname);});
        this.getCifsPrivs(xname);
    }

    getXnetshares() {
        var cb = function(data) {
            var lData = JSON.parse(data);
            this.xnetshares = [];
            lData.forEach(datum => {
                datum['!hasprivs'] = ((datum.type == "cifs") && (!this.isHome(datum.xnetshare)));
                datum['!canenable'] = ((!datum.enabled) && (datum.sourced) && (!this.isHome(datum.xnetshare)));
                datum['!candisable'] = ((datum.enabled) && (!this.isHome(datum.xnetshare)));
                datum['!candelete'] = (!this.isHome(datum.xnetshare));
                this.xnetshares.push(datum.xnetshare);
            });
            this.pane.getTable().setData(lData);
        };
        runCmd.call(this, this.name, cb, [], []);
    }

    getNfsSettings() {
        var cb = function(data) {
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
            this.buildNfsEditForm(JSON.parse(data));
        };
        this.update = [];
        runCmd.call(this, this.name, cb, ["cnf"], buildOpts({"type": "nfs", "settings": null}));
    }

    getCifsSettings() {
        var cb = function(data) {
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
            this.buildCifsEditForm(JSON.parse(data));
        };
        this.update = [];
        runCmd.call(this, this.name, cb, ["cnf"], buildOpts({"type": "cifs", "settings": null}));
    }

    getCifsHomes() {
        var cb = function(data) {
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
            this.buildHomesEditForm(JSON.parse(data));
        };
        this.update = [];
        runCmd.call(this, this.name, cb, ["hms"], buildOpts({"type": "cifs", "settings": null}));
    }

    getCifsUsers() {
        var cb = function(data) {
            var uData = JSON.parse(data);
            uData.forEach(uDatum => {
                this.users.push(uDatum.user);
            });
            this.pane.getTable().setData(uData);
        };
        this.users = [];
        runCmd.call(this, this.name, cb, ["usr", "list"], buildOpts({"type": "cifs"}));
    }

    getCifsPrivs(xname) {
        var cb = function(data) {
            var uData = JSON.parse(data);
            uData.forEach(usr => {
                this.prvUsers.push(usr.user);
            });
            this.pane.getTable().setData(uData);
        };
        this.prvUsers = [];
        runCmd.call(this, this.name, cb, ["prv", xname], buildOpts({"type": "cifs", "list": null}));
    }

    tableClickCallback(data) {
        var cbEdit = function(jData) {
            var aData = JSON.parse(jData);
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            if (data.type == "cifs") {
                this.buildCifsEditDialog(data.xnetshare, aData);
            } else if (data.type == "nfs") {
                this.buildNfsEditDialog(data.xnetshare, aData);
            }
        }
        if ("xnetshare" in data) {
            if (this.isHome(data.xnetshare)) {
                this.displayCifsHomes();
                this.getCifsHomes();
            } else {
                this.pane.showSpinner();
                runCmd.call(this, this.name, cbEdit, ["add", data.xnetshare], buildOpts({"type": data.type, "settings": null}));
            }
        } else {
            this.addXnetshare(data);
        }
    }

    usersTableClickCallback(data) {
        this.pane.getTable().loadingDone();
        this.buildUsersEditDialog(data);
    }

    prvTableClickCallback(data, xname) {
        this.pane.getTable().loadingDone();
        this.buildPrvEditDialog(xname, data);
    }

    buildAddDialog(xshares) {
        if (xshares.length == 0) {
            xshares.push("<--invalid-->");
        }
        if (this.types.length == 0) {
            this.types.push("<--invalid-->");
        }
        var dlgData = [{
                param: "xshare",
                text: "Xshare",
                value: xshares[0],
                type: "select",
                opts: xshares,
                disabled: false,
                readonly: false,
                comment: "Xshare to add as Xnetshare"
            }, {
                param: "type",
                text: "Type",
                value: this.types[0],
                type: "select",
                opts: this.types,
                disabled: false,
                readonly: false,
                comment: "Type of Xnetshare to add"
            }
        ];
        var title = "Add Xnetshare";
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            var aData = [];
            if (rData.type == "cifs") {
                this.buildCifsEditDialog(rData.xshare, aData);
            } else if (rData.type == "nfs") {
                this.buildNfsEditDialog(rData.xshare, aData);
            }
        };
        dialog.build(title, dlgData, cbOk);

    }

    buildCifsEditDialog(xname, aData) {
        //{"comment": "", "guest": "no", "readonly": false, "browseable": true, "recyclebin": true, "recyclemaxsize": "", "recyclemaxage": 0, "hidedotfiles": true, "inheritacls": true, "inheritpermissions": false, "easupport": false, "storedosattr": false, "hostsallow": "", "hostsdeny": "", "audit": false, "extraoptions": {}}
        var binChangedCallback = function(param, bin) {
            dialog.updateData([{
                param: "recyclemaxsize",
                disabled: !bin
            },{
                param: "recyclemaxage",
                disabled: !bin
            }]);
        }
        var title = "Edit CIFS Xnetshare: " + xname;
        if (aData.length == 0) {
            aData.comment = "";
            aData.guest = "no";
            aData.readonly = false;
            aData.browseable = true;
            aData.recyclebin = false;
            aData.recyclemaxsize = 0;
            aData.recyclemaxage = 0;
            aData.hidedotfiles = true;
            aData.inheritacls = true;
            aData.inheritpermissions = false;
            aData.easupport = false;
            aData.storedosattr = false;
            aData.hostsallow = "";
            aData.hostsdeny = "";
            aData.audit = false;
            aData.extraoptions = {};

            aData.addThis = true;
            title = "Add CIFS Xnetshare:" + xname;
        }

        var dlgData = [{
                param: "comment",
                text: "Comment",
                value: aData.comment,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Comment for CIFS share (default = '')"
            }, {
                param: "guest",
                text: "Guest",
                value: aData.guest,
                type: "select",
                opts: ["no", "allow", "only"],
                disabled: false,
                readonly: false,
                comment: "Allow guests (no, allow, only) (default = no)"
            }, {
                param: "readonly",
                text: "Read only",
                value: aData.readonly,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Read only share (default = false)"
            }, {
                param: "browseable",
                text: "Browseable",
                value: aData.browseable,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Browseable share (default = true)"
            }, {
                param: "recyclebin",
                text: "Recycle bin",
                value: aData.recyclebin,
                type: "boolean",
                disabled: false,
                readonly: false,
                onchange: binChangedCallback,
                comment: "Use recycle bin (default = false)"
            }, {
                param: "recyclemaxsize",
                text: "Recycle max size",
                value: aData.recyclemaxsize,
                type: "number",
                min: 0,
                step: 1,
                disabled: !aData.recyclebin,
                readonly: false,
                comment: "Max recycle bin size [bytes] (default = 0 = no limit)"
            }, {
                param: "recyclemaxage",
                text: "Recycle max age",
                value: aData.recyclemaxage,
                type: "number",
                min: 0,
                step: 1,
                disabled: !aData.recyclebin,
                readonly: false,
                comment: "Max recycle bin age [days] (default = 0 = no max)"
            }, {
                param: "hidedotfiles",
                text: "Hide dot files",
                value: aData.hidedotfiles,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Hide dot files (default = true)"
            }, {
                param: "inheritacls",
                text: "Inherit ACLs",
                value: aData.inheritacls,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Inherit ACLs (default = true)"
            }, {
                param: "inheritpermissions",
                text: "Inherit permissions",
                value: aData.inheritpermissions,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Inherit permissions (default = false)"
            }, {
                param: "easupport",
                text: "EA support",
                value: aData.easupport,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "EA support (default = false)"
            }, {
                param: "storedosattr",
                text: "Store DOS attr",
                value: aData.storedosattr,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Store dos attributes (default = false)"
            }, {
                param: "hostsallow",
                text: "Allow hosts",
                value: aData.hostsallow,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Allow hosts (default = '' separate by ,)"
            }, {
                param: "hostsdeny",
                text: "Deny hosts",
                value: aData.hostsdeny,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Deny hosts (default = '' separate by ,)"
            }, {
                param: "audit",
                text: "Audit",
                value: aData.audit,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Use audit (default = false)"
            }, {
                param: "extraoptions",
                text: "Extra options",
                value: aData.extraoptions,
                type: "object",
                disabled: false,
                readonly: false,
                comment: "Extra options (default = '', enter as key = value per line)"
            }
        ];
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            this.addEditCifs(rData, xname, aData);
        }
        dialog.build(title, dlgData, cbOk);
    }

    buildNfsEditDialog(xname, aData) {
        var cbGotIp = function(iData) {
            var ipData = JSON.parse(iData);
            //{"client": "192.168.1.0/24", "readonly": false, "extraoptions": ""}
            var title = "Edit NFS Xnetshare: " + xname;
            if (aData.length == 0) {
                aData.client = ipData[0].ip;
                aData.readonly = false;
                aData.extraoptions = "";
                aData.addThis = true;
                title = "Add NFS Xnetshare:" + xname;
            }
            var dlgData = [{
                    param: "client",
                    text: "Client",
                    value: aData.client,
                    type: "ip",
                    disabled: false,
                    readonly: false,
                    showmask: true,
                    comment: "IP address/mask (default = " + ipData[0].ip + ")"
                }, {
                    param: "readonly",
                    text: "Read only",
                    value: aData.readonly,
                    type: "boolean",
                    disabled: false,
                    readonly: false,
                    comment: "Read only share (default = false)"
                }, {
                    param: "extraoptions",
                    text: "Extra options",
                    value: aData.extraoptions,
                    type: "text",
                    disabled: false,
                    readonly: false,
                    comment: "Extra options (default = '' separate by ,)"
                }
            ];
            var dialog = new editDialog(this);
            var cbOk = function(rData) {
                this.addEditNfs(rData, xname, aData);
            }
            this.pane.disposeSpinner();
            dialog.build(title, dlgData, cbOk);
        };
        this.pane.showSpinner();
        runCmd.call(this, this.name, cbGotIp, ["ip", "/24"]);
    }

    buildUsersEditDialog(aData, avlUsrs) {
        var usernameChangedCallback = function(param, username) {
            let iFullName = "";
            avlUsrs.forEach(avlUser => {
                if (avlUser.user == username) {
                    iFullName = avlUser.fullname;
                }
            });
            dialog.updateData([{
                param: "fullname",
                value: iFullName
            }]);
        };
        var noUser = (!("user" in aData) || (aData.user == ""));
        var passwdComment = "(password is not changed when empty)";
        var fullName = aData.fullname;
        if (noUser) {
            passwdComment = "(may not be empty)";
            if (avlUsrs.length > 0) {
                fullName = avlUsrs[0].fullname;
            }
        }
        var dlgData = [{
                param: "fullname",
                text: "Full name",
                value: fullName,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "CIFS user full name (optional)"
            }, {
                param: "password",
                text: "Password",
                value: "",
                type: "password",
                disabled: false,
                readonly: false,
                comment: "CIFS password " + passwdComment
            }
        ];
        var title = "";
        if (noUser) {
            let avl = [];
            if (avlUsrs.length == 0) {
                avl.push("<--invalid-->");
            } else {
                avlUsrs.forEach(avlUser => {
                    avl.push(avlUser.user);
                });
            }
            dlgData.splice(0, 0, {
                param: "username",
                text: "User",
                value: avl[0],
                type: "select",
                opts: avl,
                disabled: false,
                readonly: false,
                onchange: usernameChangedCallback,
                comment: "CIFS username (from available linux users, add new with accounts first)"
            });
            title = "Add CIFS user";
        } else {
            title = "Edit CIFS user: " + aData.user;
        }
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            this.addEditUser(rData, noUser, aData);
        }
        dialog.build(title, dlgData, cbOk);
    }

    buildPrvEditDialog(xname, aData, usrList = []) {
        var newUser = (usrList.length != 0);
        var usernameChangedCallback = function(param, username) {
            dialog.updateData([{
                param: "invalid",
                value: false
            }, {
                param: "readonly",
                value: false
            }]);
        };
        var deleteChangedCallback = function(param, delparam) {
            dialog.updateData([{
                param: "invalid",
                disabled: delparam
            }, {
                param: "readonly",
                disabled: delparam
            }]);
        };
        if (newUser) {
            aData.username = "";
            aData.invalid = false;
            aData.readonly = false;
        }

        var dlgData = [{
                param: "invalid",
                text: "Invalid",
                value: aData.invalid,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Explicitly deny access for this user"
            }, {
                param: "readonly",
                text: "Read Only",
                value: aData.readonly,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Read only access for this user (default is read write)"
            }
        ];
        var title = "";
        if (newUser) {
            if (usrList.length == 0) {
                usrList.push("<--invalid-->");
            }
            dlgData.splice(0, 0, {
                param: "username",
                text: "User",
                value: usrList[0],
                type: "select",
                opts: usrList,
                disabled: false,
                readonly: false,
                onchange: usernameChangedCallback,
                comment: "CIFS username (from available CIFS users)"
            });
            title = "Add CIFS user privileges for: " + xname;
        } else {
            dlgData.push({
                param: "delete",
                text: "Delete",
                value: false,
                type: "boolean",
                disabled: newUser,
                readonly: false,
                onchange: deleteChangedCallback,
                comment: "Delete access for this user"
            });
            dlgData.splice(0, 0, {
                param: "username",
                text: "User",
                value: aData.user,
                type: "text",
                disabled: false,
                readonly: true
            });
            title = "Edit CIFS user privileges for: " + xname;
        }
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            this.addEditPrv(xname, rData, aData);
        }
        dialog.build(title, dlgData, cbOk);
    }

    buildNfsEditForm(aData) {
        //{"enable": true, "servers": "8"}
        var configCallback = function(param, value) {
            this.update = buildOpts(this.pane.getSettingsEditForm().getData(), aData);
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
        }

        var dlgData = [{
                param: "enable",
                text: "Enable",
                value: aData.enable,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Enable NFS server"
            }, {
                param: "servers",
                text: "Servers",
                value: aData.servers,
                type: "number",
                min: 1,
                max: 64,
                step: 1,
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Number of servers to startup (default = 8)"
            }
        ];
        this.pane.getSettingsEditForm().setData(dlgData);
    }

    buildCifsEditForm(aData) {
        //{"enable": true, "workgroup": "WORKGROUP", "serverstring": "%h server", "loglevel": "0", "sendfile": true, "aio": true, "localmaster": true, "timeserver": false, "winssupport": false, "winsserver": "", "extraoptions": {"include": "/run/cockpit/zfs/shares.conf"}}
        var configCallback = function(param, value) {
            this.update = buildOpts(this.pane.getSettingsEditForm().getData(), aData);
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
        }

        var dlgData = [{
                param: "enable",
                text: "Enable",
                value: aData.enable,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Enable CIFS server"
            }, {
                param: "workgroup",
                text: "Workgroup",
                value: aData.workgroup,
                type: "text",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Name of the workgroup (default = WORKGROUP)"
            }, {
                param: "serverstring",
                text: "Server string",
                value: aData.serverstring,
                type: "text",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Server string (default = %h server)"
            }, {
                param: "loglevel",
                text: "Loglevel",
                value: aData.loglevel,
                type: "number",
                min: 0,
                max: 10,
                step: 1,
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Log level (default = 0)"
            }, {
                param: "sendfile",
                text: "Send file",
                value: aData.sendfile,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Use send file (default = true)"
            }, {
                param: "aio",
                text: "Async IO",
                value: aData.aio,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Use asynchronous io (default = true)"
            }, {
                param: "localmaster",
                text: "Local master",
                value: aData.localmaster,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Use local master (default = true)"
            }, {
                param: "timeserver",
                text: "Time server",
                value: aData.timeserver,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Use time server (default = false)"
            }, {
                param: "winssupport",
                text: "Wins support",
                value: aData.winssupport,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Use wins support (default = false)"
            }, {
                param: "winsserver",
                text: "Wins server",
                value: aData.winsserver,
                type: "text",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Wins server (default = '')"
            }, {
                param: "extraoptions",
                text: "Extra options",
                value: aData.extraoptions,
                type: "object",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Extra options (default = '', enter as key = value per line)"
            }
        ];
        this.pane.getSettingsEditForm().setData(dlgData);
    }

    buildHomesEditForm(aData) {
        //{"enable": true, "browseable": true, "writable": true, "extraoptions": {}}
        var configCallback = function(param, value) {
            this.update = buildOpts(this.pane.getSettingsEditForm().getData(), aData);
            this.pane.setButtonDisabled(this.btnUpdate, (this.update.length == 0));
        }

        var dlgData = [{
                param: "enable",
                text: "Enable",
                value: aData.enable,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Enable homes folders (default = true)"
            }, {
                param: "browseable",
                text: "Browseable",
                value: aData.browseable,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Homes folders are browseable (default = true)"
            }, {
                param: "writable",
                text: "Writable",
                value: aData.writable,
                type: "boolean",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Homes folders are writable (default = true)"
            }, {
                param: "extraoptions",
                text: "Extra options",
                value: aData.extraoptions,
                type: "object",
                onchange: configCallback,
                disabled: false,
                readonly: false,
                comment: "Extra options (default = '', enter as key = value per line)"
            }
        ];
        this.pane.getSettingsEditForm().setData(dlgData);
    }

    addXnetshare(data = null) {
        var cbBuildLstData = function(lstData) {
            var xshares = [];
            JSON.parse(lstData).forEach(lstDatum => {
                if (!lstDatum.netshare) {
                    xshares.push(lstDatum.xshare);
                }
            });
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            if (xshares.length == 0) {
                new msgBox(this, "No available Xshares to add", "Please add a new Xshare before adding a Xnetshare");
            } else {
                this.buildAddDialog(xshares);
            }
        };
        this.pane.showSpinner();
        runCmd.call(this, this.name, cbBuildLstData, ["lst"]);
    }

    addCifsUser() {
        var data = {};
        data.user = "";
        data.fullname = "";
        var cbBuildAvlData = function(avlData) {
            var avlUsrs = [];
            JSON.parse(avlData).forEach(avl => {
                if (!avl.cifs) {
                    let avlUsr = {};
                    avlUsr.user = avl.user;
                    avlUsr.fullname = avl.fullname;
                    avlUsrs.push(avlUsr);
                }
            });
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            if (avlUsrs.length == 0) {
                new msgBox(this, "No available CIFS users", "Please add a new linux user in accounts before adding a CIFS user");
            } else {
                this.buildUsersEditDialog(data, avlUsrs);
            }
        };
        this.pane.showSpinner();
        runCmd.call(this, this.name, cbBuildAvlData, ["usr", "avl"], buildOpts({"type": "cifs"}));
    }

    addCifsPriv(xname) {
        var loadAddDlg = function(guest, uData) {
            var aData = [];
            var users = [];
            if ((guest) && (!this.prvUsers.includes("guest"))) {
                users.push("guest");
            }
            uData.forEach(uDatum => {
                if (!this.prvUsers.includes(uDatum.user)) {
                    users.push(uDatum.user);
                }
            });

            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            if (users.length == 0) {
                new msgBox(this, "No available CIFS users", "Please a new CIFS user before adding privileged users");
            } else {
                this.buildPrvEditDialog(xname, aData, users);
            }
        }
        var cbGuestReq = function(data) {
            var aData = JSON.parse(data);
            var guest = "no";
            if ("guest" in aData) {
                guest = aData.guest;
            }
            switch(guest) {
                case "allow":
                    runCmd.call(this, this.name, function(data){loadAddDlg.call(this, true, JSON.parse(data));}, ["usr", "list"], buildOpts({"type": "cifs"}));
                    break;
                case "only":
                    loadAddDlg.call(this, true, []);
                    break;
                default: // no
                    runCmd.call(this, this.name, function(data){loadAddDlg.call(this, false, JSON.parse(data));}, ["usr", "list"], buildOpts({"type": "cifs"}));
                    break;
            }
        }
        this.pane.showSpinner();
        runCmd.call(this, this.name, cbGuestReq, ["add", xname], buildOpts({"type": "cifs", "settings": null}));
    }

    addEditNfs(data, xname, aData) {
        var addXnetshare = false;
        var opts = [];
        if ("addThis" in aData) {
            addXnetshare = true;
            aData = {};
        }
        opts = buildOpts(data, aData);
        if (xname) {
            if ((addXnetshare) && (this.xnetshares.includes(xname))) {
                new msgBox(this, "Existing Xnetshare name " + xname, "Please enter a unique name for the Xnetshare");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to Xnetshare", "Xnetshare not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayXnetshares, ["add", xname], buildOpts({"type": "nfs"}).concat(opts));
                };
                var txt = "Are you sure to add " + xname + " as NFS Xnetshare?";
                new confirmDialog(this, "Add NFS Xnetshare " + xname, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty Xnetshare name", "Please enter a valid name for the Xnetshare");
        }
    }

    addEditCifs(data, xname, aData) {
        var addXnetshare = false;
        var opts = [];
        if ("addThis" in aData) {
            addXnetshare = true;
            aData = {};
        }
        opts = buildOpts(data, aData);
        if (xname) {
            if ((addXnetshare) && (this.xnetshares.includes(xname))) {
                new msgBox(this, "Existing Xnetshare name " + xname, "Please enter a unique name for the Xnetshare");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to Xnetshare", "Xnetshare not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayXnetshares, ["add", xname], buildOpts({"type": "cifs"}).concat(opts));
                };
                var txt = "Are you sure to add " + xname + " as CIFS Xnetshare?";
                new confirmDialog(this, "Add CIFS Xnetshare " + xname, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty Xnetshare name", "Please enter a valid name for the Xnetshare");
        }
    }

    addEditUser(rData, newUser, aData) {
        var opts = [];
        if (!newUser) {
            rData.username = aData.user;
            if (!rData.password) {
                delete rData.password;
            }
        } else if (!rData.password) {
            new msgBox(this, "Empty password", "Please enter a valid password for this CIFS user");
            return;
        }
        opts = buildOpts(rData, aData);
        if (rData.username) {
            if ((newUser) && (this.users.includes(rData.username))) {
                new msgBox(this, "Existing username " + rData.username, "Please enter a unique name for this CIFS user");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to CIFS user", "CIFS users not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayCifsUsers, ["usr", "add"], buildOpts({"type": "cifs"}).concat(opts));
                };
                var txt = "";
                if (newUser) {
                    txt = "Are you sure to add " + rData.username + " as CIFS user?";
                } else {
                    txt = "Are you sure to edit " + rData.username + " as CIFS user?";
                }
                new confirmDialog(this, "Add/ edit user " + rData.username, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty username", "Please enter a valid name for this CIFS user");
        }
    }

    addEditPrv(xname, rData, aData) {
        var opts = [];
        var usrOpts = [];
        var txt = "";
        if (("delete" in rData) && (rData.delete)) {
            txt = "Are you sure to delete CIFS user " + aData.user + " privileges for " + xname + "?";
            if (aData.user != "guest") {
                usrOpts = buildOpts({"username": aData.user});
            }
            opts = buildOpts({"delete": true});
        } else if ("username" in rData) {
            txt = "Are you sure to add CIFS user " + rData.username + " privileges for " + xname + "?";
            if (rData.username != "guest") {
                usrOpts = buildOpts({"username": rData.username});
            }
            opts = buildOpts(rData, [], ["username"]);
        } else {
            txt = "Are you sure to edit CIFS user " + aData.user + " privileges for " + xname + "?";
            if (aData.user != "guest") {
                usrOpts = buildOpts({"username": aData.user});
            }
            opts = buildOpts(rData, aData, ["delete"]);
        }

        if (opts.length == 0) {
            new msgBox(this, "No changes to CIFS user privileges", "CIFS user privileges not edited");
        } else {
            var cbYes = function() {
                this.pane.showSpinner("Adding/ editing...");
                runCmd.call(this, this.name, function() {this.displayCifsPrivs(this.el, xname);}, ["prv", xname], usrOpts.concat(opts));
            };
            new confirmDialog(this, "Add/ edit user " + rData.username, txt, cbYes);
        }
    }

    updateNfs() {
        var cbYes = function() {
            this.pane.dispose();
            this.displayNfsConfig("Updating settings...");
            runCmd.call(this, this.name, this.getNfsSettings, ['cnf'], buildOpts({"type": "nfs"}).concat(this.update));
        };
        if (this.update.length > 0) {
            var txt = "Are you sure to update NFS settings?"
            new confirmDialog(this, "Update NFS", txt, cbYes);
        } else {
            new msgBox(this, "No settings changed", "No update required!");
        }
    }

    updateCifs() {
        var cbYes = function() {
            this.pane.dispose();
            this.displayCifsConfig("Updating settings...");
            runCmd.call(this, this.name, this.getCifsSettings, ['cnf'], buildOpts({"type": "cifs"}).concat(this.update));
        };
        if (this.update.length > 0) {
            var txt = "Are you sure to update CIFS settings?"
            new confirmDialog(this, "Update CIFS", txt, cbYes);
        } else {
            new msgBox(this, "No settings changed", "No update required!");
        }
    }

    updateCifsHomes() {
        var cbYes = function() {
            this.pane.dispose();
            this.displayCifsHomes("Updating settings...");
            runCmd.call(this, this.name, this.getCifsHomes, ['hms'], buildOpts({"type": "cifs"}).concat(this.update));
        };
        if (this.update.length > 0) {
            var txt = "Are you sure to update CIFS homes settings?"
            new confirmDialog(this, "Update CIFS homes", txt, cbYes);
        } else {
            new msgBox(this, "No settings changed", "No update required!");
        }
    }

    clearNfs() {
        var cbYes = function() {
            var cbRfr = function(jData) {
                this.pane.disposeSpinner();
            }
            this.pane.showSpinner("Clearing...");
            runCmd.call(this, this.name, cbRfr, ["cnf"], buildOpts({"type": "nfs", "clear": null}));
        };
        var txt = "Are you sure to reset the NFS server settings to default?"
        new confirmDialog(this, "Clear NFS", txt, cbYes);
    }

    clearCifs() {
        var cbYes = function() {
            var cbRfr = function(jData) {
                this.pane.disposeSpinner();
            }
            this.pane.showSpinner("Clearing...");
            runCmd.call(this, this.name, cbRfr, ["cnf"], buildOpts({"type": "cifs", "clear": null}));
        };
        var txt = "Are you sure to reset the CIFS server settings to default?"
        new confirmDialog(this, "Clear CIFS", txt, cbYes);
    }

    refreshNfs() {
        var cbYes = function() {
            var cbRfr = function(jData) {
                this.pane.disposeSpinner();
            }
            this.pane.showSpinner("Refreshing...");
            runCmd.call(this, this.name, cbRfr, ["rfr"], buildOpts({"type": "nfs"}));
        };
        var txt = "Are you sure to restart/ refresh the NFS server?"
        new confirmDialog(this, "Refresh NFS", txt, cbYes);
    }

    refreshCifs() {
        var cbYes = function() {
            var cbRfr = function(jData) {
                this.pane.disposeSpinner();
            }
            this.pane.showSpinner("Refreshing...");
            runCmd.call(this, this.name, cbRfr, ["rfr"], buildOpts({"type": "cifs"}));
        };
        var txt = "Are you sure to restart/ refresh the CIFS server?"
        new confirmDialog(this, "Refresh CIFS", txt, cbYes);
    }

    CifsUsrDelete(data) {
        var cbYes = function() {
            this.pane.showSpinner("Deleting...");
            runCmd.call(this, this.name, this.displayCifsUsers, ["usr", "del"], buildOpts({"type": "cifs", "username": data.user}));
        };
        var txt = "Are you sure to delete CIFS user " + data.user + "?";
        new confirmDialog(this, "Delete CIFS user", txt, cbYes);
    }

    CifsPrivs(data) {
        this.displayCifsPrivs(this.el, data.xnetshare);
    }

    enable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Enabling...");
            runCmd.call(this, this.name, this.getXnetshares, ["ena", data.xnetshare]);
        };
        var txt = "Are you sure to enable " + data.xnetshare + "?" + "<br>" +
                    "This item will be accessible from the network during startup!"
        new confirmDialog(this, "Enable " + data.xnetshare, txt, cbYes);
    }

    disable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Disabling...");
            runCmd.call(this, this.name, this.getXnetshares, ["dis", data.xnetshare]);
        };
        var txt = "Are you sure to disable " + data.xnetshare + "?" + "<br>" +
                    "This item will not be accessible from the network during startup!"
        new confirmDialog(this, "Disable " + data.xnetshare, txt, cbYes);
    }

    delete(data) {
        var cbYes = function() {
            this.pane.showSpinner("Deleting...");
            runCmd.call(this, this.name, this.getXnetshares, ["del", data.xnetshare]);
        };
        var txt = "Are you sure to delete " + data.xnetshare + "?" + "<br>" +
                    "This item will be deleted from database!";
        new confirmDialog(this, "Delete " + data.xnetshare, txt, cbYes);
    }

    isHome(name) {
        return name.startsWith("(home)");
    }
}
