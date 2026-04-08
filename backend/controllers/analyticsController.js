const Complaint = require('../models/Complaint');

// GET /api/analytics — Full analytics data (admin)
exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Run all aggregations in parallel for performance
    const [
      total,
      byCategory,
      byStatus,
      dailyTrend,
      recentCount,
      avgResolutionTime,
    ] = await Promise.all([
      // Total complaints
      Complaint.countDocuments(),

      // Category distribution
      Complaint.aggregate([
        { $group: { _id: '$issueType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Status distribution
      Complaint.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Daily trend (last N days)
      Complaint.aggregate([
        { $match: { createdAt: { $gte: daysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Recent complaints (last 7 days)
      Complaint.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),

      // Average resolution time (for resolved complaints)
      Complaint.aggregate([
        { $match: { status: 'Resolved', resolvedAt: { $exists: true, $ne: null } } },
        {
          $project: {
            resolutionHours: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60,
              ],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: '$resolutionHours' } } },
      ]),
    ]);

    // Fill missing days in trend data
    const trendMap = {};
    dailyTrend.forEach((d) => { trendMap[d._id] = d.count; });

    const filledTrend = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      filledTrend.push({ date: dateStr, count: trendMap[dateStr] || 0 });
    }

    const mostFrequent = byCategory[0]?._id || 'N/A';
    const resolvedCount = byStatus.find((s) => s._id === 'Resolved')?.count || 0;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    res.json({
      summary: {
        total,
        recentCount,
        mostFrequent,
        resolutionRate,
        avgResolutionHours: avgResolutionTime[0]?.avgHours
          ? Math.round(avgResolutionTime[0].avgHours)
          : null,
      },
      byCategory,
      byStatus,
      dailyTrend: filledTrend,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};

// GET /api/analytics/public — Basic public analytics
exports.getPublicAnalytics = async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolvedCount = await Complaint.countDocuments({ status: 'Resolved' });
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    res.json({
      summary: {
        total,
        resolvedCount,
        resolutionRate,
      },
    });
  } catch (err) {
    console.error('Public analytics error:', err);
    res.status(500).json({ message: 'Failed to fetch public analytics' });
  }
};
