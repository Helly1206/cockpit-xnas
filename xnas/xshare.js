/*********************************************************
 * SCRIPT : xshare.js                                    *
 *          Javascript for xnas Cockpit web-gui          *
 *          (xshare)                                     *
 *          I. Helwegen 2020                             *
 *********************************************************/

class xshare {
    constructor(el) {
        this.el = el;
        this.name = "xshare";
        this.pane = new tabPane(this, el, this.name);
        this.dropdownContent = [
            {name : "Enable", disable: "enabled", disableValue: true, callback: this.enable},
            {name : "Disable", disable: "!candisable", disableValue: false, callback: this.disable},
            {name : "Delete", disable: "referenced", disableValue: true, callback: this.delete}
        ];
        this.xshares = [];
    }

    displayContent(el) {
        this.displayXshares();
    }

    displayXshares(el) {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's';
        this.pane.addButton("add", "Add", this.addXshare, true, false, false);
        this.pane.addButton("lst", "List", this.displayList, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.pane.getTable().setDropDown(this.dropdownContent);
        this.getXshares();
    }

    displayList() {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': list (xmounts and xremotemounts)';
        this.pane.addButton("xshr", "Xshares", this.displayXshares, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.getLst();
    }

    getXshares() {
        var cb = function(data) {
            var lData = JSON.parse(data);
            this.xshares = [];
            lData.forEach(datum => {
                datum['!candisable'] = ((datum.enabled) && (!datum.referenced));
                this.xshares.push(datum.xshare);
            });
            this.pane.getTable().setData(lData);
        };
        runCmd.call(this, this.name, cb, [], []);
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
            this.buildEditDialog(data.xshare, JSON.parse(jData), [], data.enabled);
        }
        if ("xshare" in data) {
            this.pane.showSpinner();
            runCmd.call(this, this.name, cbEdit, ["shw", data.xshare], []);
        } else {
            this.addXshare(data);
        }
    }

    buildEditDialog(xname, aData, lstData = [], enabled = false) {
        var xmountChangedCallback = function(param, xmount) {
            var remotemount = false;
            var mountpoint = "";
            if (lstData) {
                lstData.forEach(datum => {
                    if (datum.xmount == xmount) {
                        remotemount = datum.remotemount;
                        mountpoint = datum.mountpoint;
                    }
                });
            }
            dialog.updateData([{
                param: "remotemount",
                value: remotemount
            }, {
                param: "folder",
                value: "",
                filebase: mountpoint
            }, {
                param: "xshare",
                value: this.tryName(xmount, "")
            }]);
            aData.xmount = xmount;
        };
        var folderChangedCallback = function(param, folder) {
            dialog.updateData([{
                param: "xshare",
                value: this.tryName(aData.xmount, folder)
            }]);
        };
        var xmountOpts = [];
        var xmountDisabled = false;
        if ('xmount' in aData) {
            if (aData.xmount) {
                xmountDisabled = true;
                xmountOpts.push(aData.xmount);
            } else {
                if (lstData) {
                    lstData.forEach(datum => {
                        xmountOpts.push(datum.xmount);
                    });
                    aData.xmount = lstData[0].xmount;
                    aData.remotemount = lstData[0].remotemount;
                    aData.mountpoint = lstData[0].mountpoint;
                } else {
                    new msgBox(this, "No valid Xmounts found", "Please add Xmounts or Xremotemounts first");
                    return;
                }
            }
        } else {
            new msgBox(this, "No valid Xmounts found", "Please add Xmounts or Xremotemounts first");
            return;
        }
        var dlgData = [{
                param: "xmount",
                text: "Xmount",
                value: aData.xmount,
                type: "select",
                opts: xmountOpts,
                disabled: xmountDisabled,
                readonly: enabled,
                onchange: xmountChangedCallback,
                comment: "Xmount or Xremotemount to share"
            }, {
                param: "remotemount",
                text: "Remotemount",
                value: aData.remotemount,
                type: "boolean",
                disabled: false,
                readonly: enabled,
                comment: "Is the current mount a remote mount?"
            }, {
                param: "folder",
                text: "Share folder",
                value: aData.folder,
                type: "file",
                disabled: false,
                readonly: enabled,
                alttext: "Select folder to share",
                filedir: true,
                filesave: false,
                fileaddnew: false,
                filetextedit: false,
                filebase: aData.mountpoint,
                filerelative: true,
                onchange: folderChangedCallback,
                comment: "Relative folder to share on xmount"
            }
        ];
        var title = "";
        if (xname == null) {
            dlgData.splice(0, 0, {
                param: "xshare",
                text: "Xshare",
                value: this.tryName(aData.xmount, aData.folder),
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Enter a unique name for the Xshare here"
            });
            title = "Add Xshare";
        } else {
            title = "Edit Xshare: " + xname;
        }
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            this.addEdit(rData, xname, aData);
        }
        dialog.build(title, dlgData, cbOk);
        dialog.setEditButtonDisabled(enabled);
    }

    tryName(xmount, folder) {
        let name = "";
        if (xmount) {
            name = xmount;
            if (folder) {
                name += "_" + folder.replaceAll("/","");
            }
        } else {
            name = "myShare";
        }
        return generateUniqueName(this.xshares, name);
    }

    /*
    -m, --mount  : mount name to share <string> (add) (from list)
    -t, --type   : mount or remotemount type to search <string> (add) (from list)
    -f, --folder : relative folder in mount to share <string> (add)
    -u, --uacc   : users access level (,r,w) (default = rw) (add)
    -s, --sacc   : superuser access level (,r,w) (default = rw) (add)
    */
    buildAddData(data) {
        var editData = {};

        if ((data != null) && ("xmount" in data)) {
            editData.xmount = data.xmount;
            editData.remotemount = data.remotemount;
            editData.mountpoint = data.mountpoint;
        } else {
            editData.xmount = "";
            editData.remotemount = false;
            editData.mountpoint = "";
        }

        editData.folder = "";

        return editData;
    }

    addXshare(data = null) {
        var cbBuildLstData = function(lstData) {
            var editData = this.buildAddData(data);
            var enabled = false;
            if ((data != null) && ("enabled" in data)) {
                enabled = data.enabled;
            }
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            this.buildEditDialog(null, editData, JSON.parse(lstData), enabled);
        };
        this.pane.showSpinner();
        runCmd.call(this, this.name, cbBuildLstData, ["lst"]);
    }

    addEdit(data, xname, aData) {
        var addXshare = false;
        var opts = [];
        if ("xshare" in data) {
            xname = data.xshare;
            addXshare = true;
            aData = {};
        }
        opts = buildOpts(data, aData, ["xshare"]);
        if (xname) {
            if ((addXshare) && (this.xshares.includes(xname))) {
                new msgBox(this, "Existing Xshare name " + xname, "Please enter a unique name for the Xshare");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to Xshare", "Xshare not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayXshares, ["add", xname], opts);
                };
                var txt = "";
                if (addXshare) {
                    txt = "Are you sure to add " + xname + " as Xshare?";
                } else {
                    txt = "Are you sure to edit " + xname + " as Xshare?";
                }
                new confirmDialog(this, "Add/ edit Xshare " + xname, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty Xshare name", "Please enter a valid name for the Xshare");
        }
    }

    /*
    bind(data) {
        var cbYes = function() {
            this.pane.showSpinner("Binding...");
            runCmd.call(this, this.name, this.getXshares, ["bnd", data.xshare]);
        };
        var txt = "Are you sure to bind " + data.xshare + "?";
        new confirmDialog(this, "Bind " + data.xshare, txt, cbYes);
    }

    unbind(data) {
        var cbYes = function() {
            this.pane.showSpinner("Unbinding...");
            runCmd.call(this, this.name, this.getXshares, ["ubnd", data.xshare]);
        };
        var txt = "Are you sure to unbind " + data.xshare + "?";
        new confirmDialog(this, "Unbind " + data.xshare, txt, cbYes);
    }
    */

    enable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Enabling...");
            runCmd.call(this, this.name, this.getXshares, ["ena", data.xshare]);
        };
        var txt = "Are you sure to enable " + data.xshare + "?" + "<br>" +
                    "This item will be accessible locally and for netshares!"
        new confirmDialog(this, "Enable " + data.xshare, txt, cbYes);
    }

    disable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Disabling...");
            runCmd.call(this, this.name, this.getXshares, ["dis", data.xshare]);
        };
        var txt = "Are you sure to disable " + data.xshare + "?" + "<br>" +
                    "This item will not be accessible locally and for netshares!"
        new confirmDialog(this, "Disable " + data.xshare, txt, cbYes);
    }

    delete(data) {
        var cbYes = function() {
            this.pane.showSpinner("Deleting...");
            runCmd.call(this, this.name, this.getXshares, ["del", data.xshare]);
        };
        var txt = "Are you sure to delete " + data.xshare + "?" + "<br>" +
                    "This item will be deleted from database!";
        new confirmDialog(this, "Delete " + data.xshare, txt, cbYes);
    }
}
