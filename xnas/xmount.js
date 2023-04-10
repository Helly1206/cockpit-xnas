/*********************************************************
 * SCRIPT : xmount.js                                    *
 *          Javascript for xnas Cockpit web-gui          *
 *          (xmount)                                     *
 *          I. Helwegen 2020                             *
 *********************************************************/

class xmount {
    constructor(el) {
        this.el = el;
        this.name = "xmount";
        this.pane = new tabPane(this, el, this.name);
        this.dropdownContent = [
            {name : "Mount", disable: "mounted", disableValue: true, callback: this.mount},
            {name : "Unmount", disable: "mounted", disableValue: false, callback: this.unmount},
            {name : "Clear", disable: "referenced", disableValue: true, callback: this.clear},
            {name : "Delete", disable: "referenced", disableValue: true, callback: this.delete}
        ];
        this.fsTypes = ["ext2", "ext3", "ext4", "ntfs", "ntfs-3g", "fat", "vfat", "exfat", "btrfs", "jfs", "xfs", "iso9660", "udf", "zfs"];
        this.xmounts = [];
    }

    displayContent(el) {
        this.displayXmounts();
    }

    displayXmounts() {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's';
        this.pane.addButton("add", "Add", this.addXmount, true, false, false); // show available block devices (without xmount) ...
        this.pane.addButton("lst", "List", this.displayList, false, false, false); // devices without xmount can be added by clicking on them
        this.pane.addButton("blk", "Block", this.displayBlock, false, false, false); // devices without xmount can be added by clicking on them
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.pane.getTable().setDropDown(this.dropdownContent);
        this.getXmounts();
    }

    displayList() {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': list (mountable devices)';
        this.pane.addButton("xmnt", "Xmounts", this.displayXmounts, false, false, false);
        this.pane.addButton("blk", "Block", this.displayBlock, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.getLst();
    }

    displayBlock() {
        this.pane.dispose();
        this.pane.build();
        this.pane.getTitle().innerHTML = this.name.charAt(0).toUpperCase() + this.name.slice(1) + 's' + ': block (all block devices)';
        this.pane.addButton("xmnt", "Xmounts", this.displayXmounts, false, false, false);
        this.pane.addButton("lst", "List", this.displayList, false, false, false);
        this.pane.getTable().setOnClick(this.tableClickCallback);
        this.getBlk();
    }

    getXmounts() {
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

    getAvl() {
        var cb = function(data) {
            this.pane.getTable().setData(JSON.parse(data));
        };
        runCmd.call(this, this.name, cb, ["avl"], ["--human"]);
    }

    getBlk() {
        var cb = function(data) {
            this.pane.getTable().setData(JSON.parse(data));
        };
        runCmd.call(this, this.name, cb, ["blk"], ["--human"]);
    }

    tableClickCallback(data) {
        var cbEdit = function(jData) {
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            this.buildEditDialog(data.xmount, JSON.parse(jData));
        }
        if (("xmount" in data) && (data.xmount != "-")) {
            this.pane.showSpinner();
            runCmd.call(this, this.name, cbEdit, ["shw", data.xmount], ["--human"]);
        } else {
            this.addXmount(data);
        }
    }

    buildEditDialog(xname, aData, allData = []) {
        var opts = [];
        var labels = [];
        var fsnameReadOnly = true;
        var lastFsname = "";
        var methodOpts = [];
        var defaultMethodOpts = ["disabled", "startup", "auto", "dynmount"];
        if (allData.length > 0) {
            aData = allData[0];
            allData.forEach(allDatum => {
                opts.push(allDatum.fsname);
                labels.push(allDatum.label);
            });
            fsnameReadOnly = false;
            lastFsname = aData.fsname;
        } else if (Array.isArray(aData.fsname)) {
            aData.fsname.forEach(fsname => {
                opts.push(fsname);
                labels.push(aData.label);
            });
            lastFsname = aData.fsname[0];
        } else {
            opts.push(aData.fsname);
            labels.push(aData.label);
            lastFsname = aData.fsname;
        }
        if (aData.type == "zfs") {
            methodOpts = defaultMethodOpts.filter(e => e !== 'auto');
        } else {
            methodOpts = Array.from(defaultMethodOpts);
        }
        var fsnameChangedCallback = function(param, fsname) {
            if (fsname != lastFsname) {
                if (!fsname) {
                    fsname = lastFsname;
                }
                allData.forEach(allDatum => {
                    if (allDatum.fsname == fsname) {
                        aData = allDatum;
                    }
                });
                let name = "";
                if (aData.type == "zfs") {
                    name = generateUniqueName(this.xmounts, aData.mountpoint, aData.label);
                    methodOpts = Array.filter(e => e !== 'auto');
                } else {
                    name = generateUniqueName(this.xmounts, aData.mountpoint, aData.label, aData.fsname);
                    methodOpts = Array.from(defaultMethodOpts);
                }
                dialog.updateData([{
                    param: "fsname",
                    value: aData.fsname
                }, {
                    param: "xmount",
                    value: name
                }, {
                    param: "mountpoint",
                    value: aData.mountpoint
                }, {
                    param: "type",
                    value: aData.type
                }, {
                    param: "options",
                    value: aData.options
                }, {
                    param: "rw",
                    value: aData.rw
                }, {
                    param: "ssd",
                    value: aData.ssd
                }, {
                    param: "freq",
                    value: aData.freq
                }, {
                    param: "pass",
                    value: aData.pass
                }, {
                    param: "uacc",
                    value: access2string(aData.uacc)
                }, {
                    param: "sacc",
                    value: access2string(aData.sacc)
                }, {
                    param: "method",
                    value: aData.method,
                    opts: methodOpts
                }, {
                    param: "idletimeout",
                    value: aData.idletimeout,
                    disabled: (aData.method != "auto")
                }, {
                    param: "timeout",
                    value: aData.timeout
                }]);
            }
            lastFsname = fsname;
        };
        var methodChangedCallback = function(param, method) {
            dialog.updateData([{
                param: "idletimeout",
                disabled: (method != "auto")
            }]);
        };
        var dlgData = [{
                param: "fsname",
                text: "Filesystem name",
                value: aData.fsname,
                type: "disk",
                opts: opts, // use fsname as opts
                optslabel: labels,
                optssingle: !fsnameReadOnly,
                disabled: false,
                readonly: fsnameReadOnly,
                onchange: fsnameChangedCallback,
                comment: "Filesystem disk name for this Xmount"
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
                type: "text",
                opts: [],
                disabled: true,
                readonly: false,
                comment: "Filesystem type for this Xmount"
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
                param: "ssd",
                text: "SSD drive",
                value: aData.ssd,
                type: "boolean",
                disabled: false,
                readonly: false,
                comment: "Mount this filesystem as SSD drive (to increase lifetime)"
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
                param: "method",
                text: "Mount method",
                value: aData.method,
                type: "select",
                opts: methodOpts,
                disabled: false,
                readonly: false,
                comment: "Mount method for this Xmount",
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
                comment: "Unmount automount when idle for timeout seconds (default = 0)"
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
                comment: "Mount timeout in seconds (default = 0)"
            }
        ];
        var title = "";
        if (xname == null) {
            let name = "";
            if (aData.type == "zfs") {
                name = generateUniqueName(this.xmounts, aData.mountpoint, aData.label);
            } else if (Array.isArray(aData.fsname)) {
                name = generateUniqueName(this.xmounts, aData.mountpoint, aData.label, aData.fsname[0]);
            } else {
                name = generateUniqueName(this.xmounts, aData.mountpoint, aData.label, aData.fsname);
            }
            dlgData.splice(1, 0, {
                param: "xmount",
                text: "Xmount",
                value: name,
                type: "text",
                disabled: false,
                readonly: false,
                comment: "Enter a unique name for the Xmount here"
            });
            title = "Add Xmount";
        } else {
            title = "Edit Xmount: " + xname;
        }
        var dialog = new editDialog(this);
        var cbOk = function(rData) {
            rData.sacc = string2access(rData.sacc);
            rData.uacc = string2access(rData.uacc);
            if (rData.type == "zfs") {
                delete rData.fsname;
                rData.label = aData.label;
            } else if ("xmount" in rData) { // new, always add fsname
                if (!("fsname" in rData)) {
                    rData.fsname = aData.fsname;
                }
            }
            this.addEdit(rData, xname, aData);
        }
        dialog.build(title, dlgData, cbOk);
    }

    buildAddData(blkData, lstData) {
        var editData = {};

        var fsname = [];
        var uuid = [];
        blkData.forEach(blkDatum => {
            fsname.push(blkDatum.fsname);
            uuid.push(blkDatum.uuid);
        });
        if (fsname.length > 0) {
            if (fsname.length == 1) {
                editData.fsname = fsname[0];
            } else {
                editData.fsname = fsname;
            }
        } else {
            editData.fsname = "";
        }
        if (uuid.length > 0) {
            if (uuid.length == 1) {
                editData.uuid = uuid[0];
            } else {
                editData.uuid = uuid;
            }
        } else {
            editData.uuid = "";
        }
        if (blkData.length > 0) {
            editData.label = blkData[0].label;
            if (blkData[0].mountpoint == null) {
                editData.mountpoint = "";
            } else {
                editData.mountpoint = blkData[0].mountpoint;
            }
            editData.type = blkData[0].type;
        } else { // no blkData, make type none, so it cannot be added
            editData.type = "none";
            if ("mountpoint" in lstData) {
                editData.mountpoint = lstData.mountpoint;
            } else {
                editData.mountpoint = "";
            }
            editData.label = "";
        }
        if ("type" in lstData) {
            editData.options = cs2arrFilter(lstData.options, getDefopts());
            editData.rw = !lstData.options.includes("ro");
            editData.ssd = lstData.options.includes("noatime");
            editData.freq = lstData.dump;
            editData.pass = lstData.pass;
            if (!lstData.options.includes("noauto")) {
                editData.method = "startup";
                editData.idletimeout = 0;
            } else {
                if (lstData.options.includes("x-systemd.automount")) {
                    editData.method = "auto";
                    if (lstData.options.includes("x-systemd.idle-timeout")) {
                        editData.idletimeout = csGetVal(lstData.options, "x-systemd.idle-timeout");
                    } else {
                        editData.idletimeout = 0;
                    }
                } else {
                    editData.method = "disabled";
                    editData.idletimeout = 0;
                }
            }
            if (lstData.options.includes("x-systemd.mount-timeout")) {
                editData.timeout = csGetVal(lstData.options, "x-systemd.mount-timeout");
            } else {
                editData.timeout = 0;
            }
        } else {
            editData.options = [];
            editData.rw = true;
            editData.ssd = true;
            editData.freq = 0;
            editData.pass = 0;
            editData.method = "startup";
            editData.idletimeout = 0;
            editData.timeout = 0;
        }

        if (editData.mountpoint == "") {
            if (editData.label) {
                editData.mountpoint = "/mnt/" + editData.label.trim().replaceAll(" ","_").replaceAll("/","_");
            } else {
                if (Array.isArray(editData.fsname)) {
                    editData.mountpoint = "/mnt/" + editData.fsname[0].trim().replaceAll(" ","_").replaceAll("/","_");
                } else if (editData.fsname) {
                    editData.mountpoint = "/mnt/" + editData.fsname.trim().replaceAll(" ","_").replaceAll("/","_");
                } else if ("type" in lstData) {
                    editData.mountpoint = "/mnt/" + lstData.device.trim().replaceAll(" ","_").replaceAll("/","_");
                } else {
                    editData.mountpoint = "/mnt/randommountpoint" + Math.floor(Math.random() * 10000);
                }
            }
        }

        editData.uacc = "rw";
        editData.sacc = "rw";

        return editData;
    }

    hasFitData(blkDatum, lstDatum) {
        var fit = false;
        if (('type' in lstDatum) && ('type' in blkDatum)) {
            if (lstDatum.type == "zfs") {
                if (lstDatum.device == blkDatum.label) {
                    fit = true;
                }
            } else if ((blkDatum.uuid) && (lstDatum.uuid) && (blkDatum.uuid == lstDatum.uuid)) {
                fit = true;
            } else if ((blkDatum.uuid) && (lstDatum.device.toLowerCase() == blkDatum.uuid.toLowerCase())) {
                fit = true;
            } else if ((blkDatum.label) && (lstDatum.device.toLowerCase() == blkDatum.label.toLowerCase())) {
                fit = true;
            } else if ((blkDatum.fsname) && (lstDatum.device.toLowerCase() == blkDatum.fsname.toLowerCase())) {
                fit = true;
            }
        }
        return fit;
    }

    addXmount(data = null) {
        var buildDlgData = function(blkData, lstData) {
            var editData = this.buildAddData(blkData, lstData);
            this.pane.getTable().loadingDone();
            this.pane.disposeSpinner();
            if (('type' in editData) && (editData.type != "none")) {
                this.buildEditDialog(null, editData);
            } else {
                new msgBox(this, "Invalid device", "Device cannot been added as Xmount");
            }
        };
        var cbBlock = function(jData) {
            var blkData = [];
            JSON.parse(jData).forEach(blkDatum => {
                if (this.hasFitData(blkDatum, data)) {
                    blkData.push(blkDatum);
                }
            });
            buildDlgData.call(this, blkData, data);
        };
        var cbList = function(jData) {
            var lstData = {};
            JSON.parse(jData).forEach(lstDatum => {
                if (this.hasFitData(data, lstDatum)) {
                    lstData = lstDatum;
                }
            });
            if ("type" in lstData) {
                data = lstData;
                runCmd.call(this, this.name, cbBlock, ["blk"], ["--human"]);
            } else {
                buildDlgData.call(this, [data], lstData);
            }
        };
        var cbAll = function(jBlkData) {
            var cbListAll = function(jLstData) {
                var allData = [];
                JSON.parse(jBlkData).forEach(blkDatum => {
                    if (('type' in blkDatum) && (this.fsTypes.includes(blkDatum.type)) && (!this.xmounts.includes(blkDatum.xmount))) {
                        let lstMatchDatum = {};
                        JSON.parse(jLstData).forEach(lstDatum => {
                            if (this.hasFitData(blkDatum, lstDatum)) {
                                lstMatchDatum = lstDatum;
                            }
                        });
                        allData.push(this.buildAddData([blkDatum], lstMatchDatum));
                    }
                });
                this.pane.getTable().loadingDone();
                this.pane.disposeSpinner();
                if (allData.length > 0) {
                    this.buildEditDialog(null, null, allData);
                } else {
                    new msgBox(this, "No available Xmounts to be added", "Add a device first");
                }
            }
            runCmd.call(this, this.name, cbListAll, ["lst"]);
        };

        this.pane.showSpinner();
        if (data) {
            if ('mounted' in data) {
                // Data is block, get list
                runCmd.call(this, this.name, cbList, ["lst"]);
            } else {
                // Data is list, get block
                runCmd.call(this, this.name, cbBlock, ["blk"], ["--human"]);
            }
        } else {
            runCmd.call(this, this.name, cbAll, ["blk"], ["--human"]);
        }
    }

    addEdit(data, xname, aData) {
        var addXmount = false;
        var opts = [];
        if ("xmount" in data) {
            xname = data.xmount;
            addXmount = true;
            aData = {};
        }
        opts = buildOpts(data, aData, ["xmount"]);
        if (xname) {
            if ((addXmount) && (this.xmounts.includes(xname))) {
                new msgBox(this, "Existing Xmount name " + xname, "Please enter a unique name for the Xmount");
            } else if (opts.length == 0) {
                new msgBox(this, "No changes to Xmount", "Xmount not edited");
            } else {
                var cbYes = function() {
                    this.pane.showSpinner("Adding/ editing...");
                    runCmd.call(this, this.name, this.displayXmounts, ["add", xname], opts);
                };
                var txt = "";
                if (addXmount) {
                    txt = "Are you sure to add " + xname + " as Xmount?";
                } else {
                    txt = "Are you sure to edit " + xname + " as Xmount?";
                }
                new confirmDialog(this, "Add/ edit Xmount " + xname, txt, cbYes);
            }
        } else {
            new msgBox(this, "Empty Xmount name", "Please enter a valid name for the Xmount");
        }
    }

    mount(data) {
        var cbYes = function() {
            this.pane.showSpinner("Mounting...");
            runCmd.call(this, this.name, this.getXmounts, ["mnt", data.xmount]);
        };
        var txt = "Are you sure to mount " + data.xmount + "?";
        new confirmDialog(this, "Mount " + data.xmount, txt, cbYes);
    }

    unmount(data) {
        var cbYes = function() {
            this.pane.showSpinner("Unmounting...");
            runCmd.call(this, this.name, this.getXmounts, ["umnt", data.xmount]);
        };
        var txt = "Are you sure to unmount " + data.xmount + "?";
        new confirmDialog(this, "Unmount " + data.xmount, txt, cbYes);
    }

    /*
    enable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Enabling...");
            runCmd.call(this, this.name, this.getXmounts, ["ena", data.xmount]);
        };
        var txt = "Are you sure to enable " + data.xmount + "?" + "<br>" +
                    "This item will automatically mount during startup!"
        new confirmDialog(this, "Enable " + data.xmount, txt, cbYes);
    }

    disable(data) {
        var cbYes = function() {
            this.pane.showSpinner("Disabling...");
            runCmd.call(this, this.name, this.getXmounts, ["dis", data.xmount]);
        };
        var txt = "Are you sure to disable " + data.xmount + "?" + "<br>" +
                    "This item will not automatically mount during startup!"
        new confirmDialog(this, "Disable " + data.xmount, txt, cbYes);
    }
    */

    clear(data) {
        var cbYes = function() {
            this.pane.showSpinner("clearing...");
            runCmd.call(this, this.name, this.getXmounts, ["clr", data.xmount]);
        };
        var txt = "Are you sure to clear " + data.xmount + "?" + "<br>" +
                    "This item will be deleted from database but not from fstab!"
        new confirmDialog(this, "Clear " + data.xmount, txt, cbYes);
    }

    delete(data) {
        var cbYes = function() {
            this.pane.showSpinner("Deleting...");
            runCmd.call(this, this.name, this.getXmounts, ["del", data.xmount]);
        };
        var txt = "Are you sure to delete " + data.xmount + "?" + "<br>" +
                    "This item will be deleted from database and fstab!";
        new confirmDialog(this, "Delete " + data.xmount, txt, cbYes);
    }
}
