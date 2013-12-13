(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * The column Status for planning board columns on a cardboard.
     */

    Ext.define('Rally.apps.iterationplanningboard.IterationPlanningBoardColumnProgressBar', {
        extend: 'Ext.Component',
        alias: 'widget.rallyiterationplanningboardcolumnprogressbar',

        renderTpl: Ext.create('Rally.ui.renderer.template.progressbar.TimeboxProgressBarTemplate', {
            height: '14px',
            width: '80%'
        }),

        update: function() {
            var html = this.renderTpl.apply(this._getRenderData());
            this.callParent([html]);
        },

        _getColumn: function() {
            return this.column;
        },

        _getRenderData: function() {
            var totalPointCount = this._getTotalPointCount();
            var plannedVelocity = this._getPlannedVelocity();
            return {
                percentDone: totalPointCount / plannedVelocity,
                amountComplete: totalPointCount,
                total: plannedVelocity
            };
        },

        _getTotalPointCount: function() {
            return _.reduce(this._getColumn().getCards(true), function(memo, card) {
                var planEstimate = card.getRecord().get('PlanEstimate');
                return Ext.isNumber(planEstimate) ? memo + planEstimate : memo;
            }, 0);
        },

        _getPlannedVelocity: function() {
            return _.reduce(this._getColumn().getTimeboxRecords(), function(memo, record) {
                var plannedVelocity = record.get('PlannedVelocity');
                return Ext.isNumber(plannedVelocity) ? memo + plannedVelocity : memo;
            }, 0);
        }
    });
})();