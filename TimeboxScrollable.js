(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * @private
     * Allows the Iteration Planning Board CardBoard to be scrolled forwards and backwards
     */
    Ext.define('Rally.apps.iterationplanningboard.TimeboxScrollable', {
        alias: 'plugin.rallytimeboxscrollablecardboard',
        extend: 'Rally.ui.cardboard.plugin.Scrollable',
        requires:['Rally.util.Array'],

        _isBackwardsButtonHidden: function(){
            return this.cmp.scrollableColumnRecords[0] === this.getFirstVisibleScrollableColumn().timeboxRecords;
        },

        _isForwardsButtonHidden: function(){
            return Rally.util.Array.last(this.cmp.scrollableColumnRecords) === this.getLastVisibleScrollableColumn().timeboxRecords;
        },

        _scroll: function(forwards){
            var insertNextToColumn = this._getInsertNextToColumn(forwards);
            var newlyVisibleRecords = this.cmp.scrollableColumnRecords[Ext.Array.indexOf(this.cmp.scrollableColumnRecords, insertNextToColumn.timeboxRecords) + (forwards ? 1 : -1)];

            var indexOfNewColumn = Ext.Array.indexOf(this.cmp.getColumns(), insertNextToColumn);
            this.cmp.destroyColumn(this._getColumnToRemove(forwards));

            var column = this.cmp.addColumn({timeboxRecords: newlyVisibleRecords}, indexOfNewColumn);
            column.on('ready', this._onNewlyAddedColumnReady, this, {single: true});

            var columnEls = this.cmp.createColumnElements(forwards ? 'after' : 'before', insertNextToColumn);
            this.cmp.renderColumn(column, columnEls);

            this.cmp.fireEvent('scroll', this.cmp);

            this._afterScroll(forwards);
        },

        _onNewlyAddedColumnReady: function(){
            this.cmp.applyLocalFilters();
        },

        _sizeButtonToColumnHeader: function(button, column){
            var columnHeaderHeight = column.getColumnHeaderCell().getHeight(Ext.isGecko || Ext.isIE);

            button.getEl().setHeight(columnHeaderHeight);
        }
    });
})();