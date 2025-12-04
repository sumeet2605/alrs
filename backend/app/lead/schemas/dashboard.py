from pydantic import BaseModel
from typing import List


class MonthlyRevenueItem(BaseModel):
    month: str         # "2025-12"
    revenue: float     # total paid revenue for that month


class LeadSourceItem(BaseModel):
    source: str        # "instagram_dm", "referral", ...
    leads: int
    quoted: int
    booked: int
    delivered: int
    revenue: float     # revenue from this source


class FunnelMetrics(BaseModel):
    leads: int
    quoted: int
    booked: int
    delivered: int


class GstSummary(BaseModel):
    total_taxable: float
    total_gst: float
    invoices_count: int
    gross_revenue: float


class BusinessDashboardResponse(BaseModel):
    revenue_monthly: List[MonthlyRevenueItem]
    lead_sources: List[LeadSourceItem]
    funnel: FunnelMetrics
    gst_summary: GstSummary
