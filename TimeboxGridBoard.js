(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     *
     * If we end up having both an IterationPlanningBoardApp and a RelasePlanningBoardApp, then this should probably be in rui.
     *
     * A GridBoard that displays timebox information.
     */
    Ext.define('Rally.apps.iterationplanningboard.TimeboxGridBoard', {
        extend: 'Rally.ui.gridboard.GridBoard',
        alias: 'widget.iterationplanningboardapptimeboxgridboard',
        requires: [
            'Rally.util.Array',
            'Rally.util.Ui',
            'Rally.data.ModelFactory',
            'Rally.ui.gridboard.TimeboxBlankSlate',
            'Rally.apps.iterationplanningboard.TimeboxCardBoard',
            'Rally.apps.iterationplanningboard.IterationPlanningBoardBacklogColumn',
            'Rally.apps.iterationplanningboard.IterationPlanningBoardColumn'
        ],
        mixins: ['Rally.Messageable'],

        /**
         * @cfg {Number}
         */
        numColumns: 3,

        initComponent: function() {
            this.on('toggle', function(toggleState, gridOrBoard) {
                if (toggleState === 'board' && !this._hasTimeboxes()) {
                    this.mon(gridOrBoard, 'aftercolumnrender', this._addBoardBlankSlate, this);
                }
            }, this);

            this.subscribe(Rally.Message.objectCreate, this._onObjectChange, this);
            this.subscribe(Rally.Message.objectUpdate, this._onObjectChange, this);
            this.subscribe(Rally.Message.objectDestroy, this._onObjectChange, this);

            this.callParent(arguments);
        },
        
        _addGridOrBoard: function() {
            if (!this.timeboxes) {
                this.timeboxType = 'Iteration';
                Rally.data.ModelFactory.getModel({
                    type: this.timeboxType,
                    context: this.getContext().getDataContext(),
                    success: this._findTimeboxes,
                    scope: this
                });
                this.setLoading(true);
            } else {
                this.callParent(arguments);
            }
        },

        _getBoardConfig: function() {
            var initiallyVisibleTimeboxes = this._getInitiallyVisibleTimeboxes();
            var columns = this._getColumnConfigs(initiallyVisibleTimeboxes);
            return Ext.merge(this.callParent(arguments), {
                xtype: 'rallytimeboxcardboard',
                attribute: this.timeboxType,
                columns: columns,
                columnConfig: {
                    xtype: 'iterationplanningboardappplanningcolumn',
                    additionalFetchFields: ['PortfolioItem'],
                    storeConfig : {
                        fetch: ['Parent', 'Requirement']
                    }
                },
                scrollableColumnRecords: this.timeboxes
            });
        },

        _getInitiallyVisibleTimeboxes: function(){
            if(this.timeboxes.length <= this.numColumns){
                return this.timeboxes;
            }

            var previousTimeboxes = [];
            var futureAndCurrentTimeboxes = [];
            Ext.Array.each(this.timeboxes, function(timeboxRecords){
                if(timeboxRecords[0].get('EndDate') >= new Date()){
                    futureAndCurrentTimeboxes.push(timeboxRecords);
                }else{
                    previousTimeboxes.push(timeboxRecords);
                }
            });
            futureAndCurrentTimeboxes = Rally.util.Array.firstElementsOf(futureAndCurrentTimeboxes, this.numColumns);

            var possiblyVisibleTimeboxes = previousTimeboxes.concat(futureAndCurrentTimeboxes);
            return Rally.util.Array.lastElementsOf(possiblyVisibleTimeboxes, this.numColumns);
        },

        _getColumnConfigs: function(timeboxes) {
            var columns = [{
                xtype: 'iterationplanningboardappbacklogcolumn',
                flex: this._hasTimeboxes() ? 1 : 1/3,
                cardLimit: Ext.isIE ? 25 : 100,
                columnHeaderConfig: {
                    headerTpl: 'Backlog'
                }
            }];

            Ext.Array.each(timeboxes, function(timeboxRecords) {
                columns.push({
                    timeboxRecords: timeboxRecords,
                    columnHeaderConfig: {
                        record: timeboxRecords[0],
                        fieldToDisplay: 'Name',
                        editable: false
                    }
                });
            }, this);

            return columns;
        },

        _hasTimeboxes: function() {
            return this.timeboxes && this.timeboxes.length > 0;
        },

        _findTimeboxes: function(model) {
            Ext.create('Rally.data.wsapi.Store', {
                model: model,
                fetch: ['Name', 'StartDate', 'EndDate', 'Project', 'PlannedVelocity'],
                autoLoad: true,
                listeners: {
                    load: this._onTimeboxesLoad,
                    scope: this
                },
                context: this.getContext().getDataContext(),
                limit: Infinity
            });
        },

        _addBoardBlankSlate: function(board) {
            this.addCls('no-timebox');
            board.getEl().down('.columns tr td').setStyle('width', '33%');
            var blankSlateTd = Ext.DomHelper.append(board.getEl().down('.columns tr'), '<td class="blank-slate-column"></td>', true);

            var blankSlate = Ext.widget({
                xtype: 'rallytimeboxblankslate',
                timeboxType: this.timeboxType,
                context: this.getContext(),
                renderTo: blankSlateTd
            });

            this.on('destroy', function() {
                blankSlate.destroy();
            });

            if (Rally.BrowserTest) {
                Rally.BrowserTest.publishComponentReady(this);
            }
        },

        _onTimeboxesLoad: function(store) {
            var likeTimeboxesObj = {};
            store.each(function(timebox) {
                var timeboxKey = Ext.String.format("{0}{1}{2}",
                    timebox.get('Name'), timebox.get('StartDate'), timebox.get('EndDate'));
                likeTimeboxesObj[timeboxKey] = Ext.Array.push(likeTimeboxesObj[timeboxKey] || [], timebox);
            });

            var sortedLikeTimeboxes = Ext.Array.sort(Ext.Object.getValues(likeTimeboxesObj), function(likeTimeboxes1, likeTimeboxes2) {
                return likeTimeboxes1[0].get('EndDate') - likeTimeboxes2[0].get('EndDate');
            });

            this.timeboxes = Ext.Array.filter(sortedLikeTimeboxes, function(likeTimeboxes) {
                return Ext.Array.some(likeTimeboxes, function(timebox) {
                    return Rally.util.Ref.getRelativeUri(timebox.get('Project')) === Rally.util.Ref.getRelativeUri(this.getContext().getProject());
                }, this);
            }, this);

            this.setLoading(false);
            this._addGridOrBoard('board');
        },

        _onObjectChange: function(record) {
            if (Ext.isArray(record)) {
                Ext.Array.each(record, this._onObjectChange, this);
                return;
            }

            if (record.get('_type').toLowerCase() === this.timeboxType.toLowerCase()) {
                var gridOrBoard = this.getGridOrBoard();
                if (gridOrBoard) {
                    gridOrBoard.destroy();
                }

                this.timeboxes = null;
                this._addGridOrBoard();
            }
        }
    });
})();
