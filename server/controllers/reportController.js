import { buildInspectionPDF } from '../services/pdfReportService.js';
import { Inspection } from '../models/Inspection.js';
import { Defect } from '../models/Defect.js';
import { MaintenanceTask } from '../models/MaintenanceTask.js';
import { Locomotive } from '../models/Locomotive.js';

// @desc    Download Inspection PDF Report
// @route   GET /api/reports/inspections/:id/pdf
// @access  Private
export const getInspectionPDFReport = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="RailReady_Inspection_${inspection.inspectionNumber}.pdf"`
    );

    await buildInspectionPDF(inspection._id, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get Custom Consolidated Operations Report Data
// @route   POST /api/reports/summary
// @access  Private
export const getSummaryReportData = async (req, res, next) => {
  try {
    const { startDate, endDate, locomotiveId, reportType } = req.body;
    const dateQuery = {};

    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);

    const filter = {};
    if (Object.keys(dateQuery).length > 0) filter.createdAt = dateQuery;
    if (locomotiveId) filter.locomotive = locomotiveId;

    let results = {};

    if (reportType === 'inspections' || !reportType) {
      results.inspections = await Inspection.find(filter)
        .populate('locomotive', 'locoNumber locoClass')
        .populate('inspector', 'name role')
        .sort({ createdAt: -1 });
    }

    if (reportType === 'defects' || !reportType) {
      results.defects = await Defect.find(filter)
        .populate('locomotive', 'locoNumber locoClass')
        .populate('reportedBy', 'name role')
        .sort({ createdAt: -1 });
    }

    if (reportType === 'maintenance' || !reportType) {
      results.maintenance = await MaintenanceTask.find(filter)
        .populate('locomotive', 'locoNumber locoClass')
        .populate('assignedStaff', 'name role')
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (err) {
    next(err);
  }
};
