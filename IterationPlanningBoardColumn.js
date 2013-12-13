(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     *
     * Should this be a generic 'TimeboxColumn' class in rui?
     *
     * A column that is ideal for iteration (and soon, release) planning. It will render the iteration's start
     * and end dates in the header.
     *
     *     columnConfig: {
     *         xtype: 'iterationplanningboardappplanningcolumn',
     *         records: [iterationRecord]
     *     }
     *
     * And for releases:
     *
     *     columnConfig: {
     *         xtype: 'iterationplanningboardappplanningcolumn',
     *         records: [releaseRecord],
     *         startDateField: 'ReleaseStartDate',
     *         endDatefield: 'ReleaseEndDate'
     *     }
     *
     */
    Ext.define('Rally.apps.iterationplanningboard.IterationPlanningBoardColumn', {
        extend: 'Rally.ui.cardboard.Column',
        alias: 'widget.iterationplanningboardappplanningcolumn',

        config: {
            /**
             * @cfg {String}
             * The name of the field inside the record that stores the start date
             */
            startDateField: 'StartDate',

            /**
             * @cfg {String}
             * The name of the field inside the record that stores the end date
             */
            endDateField: 'EndDate',

            /**
             * @cfg {Rally.domain.WsapiModel[]}
             * The timebox records (Iteration or Release) for this column
             */
            timeboxRecords: [],

            /**
             * @cfg {Object} columnStatusConfig
             * A config object that will be applied to the column's status area (between the header and content cells).
             * Used here for the progress bar.
             */
            columnStatusConfig: {
                xtype: 'rallyiterationplanningboardcolumnprogressbar'
            }
        },

        cls: 'column',

        currentTimeboxCls: 'current-timebox',

        requires: [
            'Ext.XTemplate',
            'Rally.apps.iterationplanningboard.IterationPlanningBoardColumnProgressBar'
        ],

        constructor: function(config) {
            this.mergeConfig(config);
            this.config = Ext.merge({
                columnHeaderConfig: {
                    record: this._getTimeboxRecord(),
                    fieldToDisplay: 'Name',
                    editable: false
                }
            }, this.config);
            this.config.value = Rally.util.Ref.getRelativeUri(this._getTimeboxRecord());
            this.config.moreItemsConfig = {
                token: Rally.nav.Manager.getDetailHash(this._getTimeboxRecord(), {scope: '', subPage: 'scheduled'})
            };

            this.callParent([this.config]);
        },

        initComponent: function() {
            this.callParent(arguments);

            this.on({
                beforecarddroppedsave:  this._onBeforeCardDrop,
                addcard:                this._updateColumnStatus,
                load:                   this._updateColumnStatus,
                removecard:             this._updateColumnStatus,
                cardupdated:            this._updateColumnStatus,
                afterrender: {
                    fn: this._addPlanningClasses,
                    single: true
                },
                scope: this
            });
        },

        _updateColumnStatus: function() {
            this.columnStatus.update();
        },

        getStoreFilter: function(model) {
            var modelName = this._getTimeboxRecord().self.displayName;
            return [
                {
                    property: modelName + ".Name",
                    value: this._getTimeboxRecord().get('Name')
                },
                {
                    property: modelName + "." + this.startDateField,
                    value: Rally.util.DateTime.toIsoString(this._getTimeboxRecord().get(this.startDateField))
                },
                {
                    property: modelName + "." + this.endDateField,
                    value: Rally.util.DateTime.toIsoString(this._getTimeboxRecord().get(this.endDateField))
                }
            ];
        },

        getColumnStatus: function() {
             return this.columnStatus;
        },

        getStatusCell: function() {
            return Ext.get(this.statusCell);
        },

        isMatchingRecord: function(record) {
            return Ext.Array.some(this.timeboxRecords, function(timeboxRecord) {
                return Rally.util.Ref.getOidFromRef(record.get('Iteration')) === timeboxRecord.get('ObjectID');
            });
        },

        afterRender: function() {
            this.callParent(arguments);
            this.drawStatus();
        },

        drawHeader: function() {
            this.callParent(arguments);
            this._addTimeboxDates();
        },

        drawStatus: function() {
            if (this.columnStatusConfig && !this.getColumnStatus()) {
                var config = {
                    renderTo: this.getStatusCell(),
                    column: this
                };

                config = Ext.merge({}, config, this.columnStatusConfig);
                this.columnStatus = Ext.widget(config);
            }
        },

        _addTimeboxDates: function() {
            this.getColumnHeader().add({
                xtype: 'component',
                html: this.getTimeboxDatesTpl().apply(this.getTimeboxDatesTplData())
            });
        },

        getTimeboxDatesTpl: function() {
            this.timeboxDatesTpl = this.timeboxDatesTpl || Ext.create('Ext.XTemplate',
                '<div class="timeboxDates">{formattedStartDate} - {formattedEndDate}</div>');

            return this.timeboxDatesTpl;
        },

        getTimeboxDatesTplData: function() {
            return {
                formattedStartDate: this._getFormattedDate(this.startDateField),
                formattedEndDate: this._getFormattedDate(this.endDateField)
            };
        },

        getProgressBar: function() {
            return this.getColumnStatus();
        },

        _getFormattedDate: function(fieldName) {
            return Rally.util.DateTime.formatWithNoYearWithDefault(this._getTimeboxRecord().get(fieldName));
        },

        _getTimeboxRecord: function() {
            return this.timeboxRecords[0];
        },

        _onBeforeCardDrop: function(column, card) {
            var cardProjectRef = Rally.util.Ref.getRelativeUri(card.getRecord().get('Project'));
            if (cardProjectRef !== Rally.util.Ref.getRelativeUri(column.context.getProject())) {

                if (!Ext.Array.some(this.timeboxRecords, function(timeboxRecord) {
                    return cardProjectRef === Rally.util.Ref.getRelativeUri(timeboxRecord.get('Project'));
                })) {
                    card.getRecord().set('Project', column.context.getProject()._ref);
                }
            }
        },

        _isCurrentTimebox: function(){
            var now = new Date();
            return this._getTimeboxRecord().get('StartDate') <= now && this._getTimeboxRecord().get('EndDate') >= now;
        },

        _addPlanningClasses: function() {
            var cls = 'planning-column';
            if (this._isCurrentTimebox()) {
                cls += ' ' + this.currentTimeboxCls;

            }
            this.getContentCell().addCls(cls);
            this.getStatusCell().addCls(cls);
            this.getColumnHeaderCell().addCls(cls);
        }
    });
})();
