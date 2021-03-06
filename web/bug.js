/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is "Incompatible With Secondary Licenses", as
 * defined by the Mozilla Public License, v. 2.0.
 */

/* This library assumes that the needed YUI libraries have been loaded 
   already. */

YAHOO.bugzilla.dupTable = {
    counter: 0,
    dataSource: null,
    updateTable: function(dataTable, product_name, summary_field, description_field) {
        if (summary_field.value.length < 4 && description_field.value.length < 4  ) return;
        YAHOO.bugzilla.dupTable.counter = YAHOO.bugzilla.dupTable.counter + 1;
        YAHOO.util.Connect.setDefaultPostHeader('application/json', true);
        var json_object = {
            version : "1.1",
            method : "DupFinder.Bug.possible_duplicates",
            id : YAHOO.bugzilla.dupTable.counter,
            params : {
                product : product_name,
                summary : summary_field.value,
                description : description_field.value,
                limit : 5,
                include_fields : [ "id", "summary", "status", "resolution",
                                   "update_token" ]
            }
        };
        var post_data = YAHOO.lang.JSON.stringify(json_object);

        var callback = {
            success: dataTable.onDataReturnInitializeTable,
            failure: dataTable.onDataReturnInitializeTable,
            scope:   dataTable,
            argument: dataTable.getState() 
        };
        dataTable.showTableMessage(dataTable.get("MSG_LOADING"),
                                   YAHOO.widget.DataTable.CLASS_LOADING);
        YAHOO.util.Dom.removeClass('possible_duplicates_container',
                                   'bz_default_hidden');
        dataTable.getDataSource().sendRequest(post_data, callback);
    },
    // This is the keyup event handler. It calls updateTable with a relatively
    // long delay, to allow additional input. However, the delay is short
    // enough that nobody could get from the summary field to the Submit
    // Bug button before the table is shown (which is important, because
    // the showing of the table causes the Submit Bug button to move, and
    // if the table shows at the exact same time as the button is clicked,
    // the click on the button won't register.)
    doUpdateTable: function(e, args) {
        var dt = args[0];
        var product_name = args[1];
        var summary = YAHOO.util.Dom.get(args[2]);
        var description = YAHOO.util.Dom.get(args[3]);
        clearTimeout(YAHOO.bugzilla.dupTable.lastTimeout);
        YAHOO.bugzilla.dupTable.lastTimeout = setTimeout(function() {
            YAHOO.bugzilla.dupTable.updateTable(dt, product_name, summary, description) },
            600);
    },
    formatBugLink: function(el, oRecord, oColumn, oData) {
        el.innerHTML = '<a href="show_bug.cgi?id=' + oData + '" target="_blank">' 
                       + oData + '</a>';
    },
    formatStatus: function(el, oRecord, oColumn, oData) {
        var resolution = oRecord.getData('resolution');
        var bug_status = display_value('bug_status', oData);
        if (resolution) {
            el.innerHTML = bug_status + ' ' 
                           + display_value('resolution', resolution);
        }
        else {
            el.innerHTML = bug_status;
        }
    },
    formatCcButton: function(el, oRecord, oColumn, oData) {
        var url = 'process_bug.cgi?id=' + oRecord.getData('id') 
                  + '&addselfcc=1&token=' + escape(oData);
        var button = document.createElement('a');
        button.setAttribute('href',  url);
        button.innerHTML = YAHOO.bugzilla.dupTable.addCcMessage;
        el.appendChild(button);
        new YAHOO.widget.Button(button);
    },
    init_ds: function() {
        var new_ds = new YAHOO.util.XHRDataSource("jsonrpc.cgi");
        new_ds.connTimeout = 30000;
        new_ds.connMethodPost = true;
        new_ds.connXhrMode = "cancelStaleRequests";
        new_ds.maxCacheEntries = 3;
        new_ds.responseSchema = {
            resultsList : "result.bugs",
            metaFields : { error: "error", jsonRpcId: "id" }
        };
        // DataSource can't understand a JSON-RPC error response, so
        // we have to modify the result data if we get one.
        new_ds.doBeforeParseData = 
            function(oRequest, oFullResponse, oCallback) {
                if (oFullResponse.error) {
                    oFullResponse.result = {};
                    oFullResponse.result.bugs = [];
                    if (console) {
                        console.log("JSON-RPC error:", oFullResponse.error);
                    }
                }
                return oFullResponse;
        }

        this.dataSource = new_ds;
    },
    init: function(data) {
        if (this.dataSource == null) this.init_ds();
        data.options.initialLoad = false;
        var dt = new YAHOO.widget.DataTable(data.container, data.columns, 
            this.dataSource, data.options);
        YAHOO.util.Event.on(data.summary_field, 'keyup', this.doUpdateTable,
                            [dt, data.product_name, data.summary_field, data.description_field]);
        YAHOO.util.Event.on(data.description_field, 'keyup', this.doUpdateTable,
                            [dt, data.product_name, data.summary_field, data.description_field]);
    }
};
