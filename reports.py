import streamlit as st
import pandas as pd
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)


# -------------------------
# PDF GENERATOR
# -------------------------

def generate_pdf_report(expenses):

    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm
    )

    elements = []
    styles = getSampleStyleSheet()

    # -------------------------
    # TITLE
    # -------------------------

    elements.append(
        Paragraph(
            "SpendWise AI - Expense Report",
            styles["Title"]
        )
    )

    elements.append(Spacer(1, 10))

    generated_date = datetime.now().strftime(
        "%d %B %Y"
    )

    elements.append(
        Paragraph(
            f"Generated on: {generated_date}",
            styles["Normal"]
        )
    )

    elements.append(Spacer(1, 18))

    # -------------------------
    # CALCULATIONS
    # -------------------------

    total_spent = sum(
        expense["amount"]
        for expense in expenses
    )

    transaction_count = len(expenses)

    category_totals = {}

    for expense in expenses:
        category = expense["category"]

        category_totals[category] = (
            category_totals.get(category, 0)
            + expense["amount"]
        )

    # -------------------------
    # SUMMARY
    # -------------------------

    elements.append(
        Paragraph(
            "Expense Summary",
            styles["Heading2"]
        )
    )

    elements.append(Spacer(1, 8))

    summary_data = [
        ["Total Spent", f"Rs. {total_spent:.2f}"],
        ["Transactions", str(transaction_count)]
    ]

    summary_table = Table(
        summary_data,
        colWidths=[6 * cm, 6 * cm]
    )

    summary_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, -1),
                colors.whitesmoke
            ),
            (
                "BOX",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "INNERGRID",
                (0, 0),
                (-1, -1),
                0.25,
                colors.lightgrey
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                10
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                8
            )
        ])
    )

    elements.append(summary_table)
    elements.append(Spacer(1, 18))

    # -------------------------
    # CATEGORY BREAKDOWN
    # -------------------------

    elements.append(
        Paragraph(
            "Category Breakdown",
            styles["Heading2"]
        )
    )

    elements.append(Spacer(1, 8))

    category_data = [
        ["Category", "Amount"]
    ]

    for category, total in sorted(
        category_totals.items(),
        key=lambda item: item[1],
        reverse=True
    ):
        category_data.append([
            category,
            f"Rs. {total:.2f}"
        ])

    category_table = Table(
        category_data,
        colWidths=[8 * cm, 4 * cm],
        repeatRows=1
    )

    category_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.lightgrey
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                9
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7
            )
        ])
    )

    elements.append(category_table)
    elements.append(Spacer(1, 18))

    # -------------------------
    # TRANSACTIONS
    # -------------------------

    elements.append(
        Paragraph(
            "Transactions",
            styles["Heading2"]
        )
    )

    elements.append(Spacer(1, 8))

    transaction_data = [
        [
            "Expense",
            "Category",
            "Amount",
            "Date",
            "Description"
        ]
    ]

    for expense in expenses:

        formatted_date = datetime.strptime(
            expense["date"],
            "%Y-%m-%d"
        ).strftime("%d %b %Y")

        transaction_data.append([
            str(expense["name"]),
            str(expense["category"]),
            f"Rs. {expense['amount']:.2f}",
            formatted_date,
            str(expense["description"] or "-")
        ])

    transaction_table = Table(
        transaction_data,
        repeatRows=1,
        colWidths=[
            3.8 * cm,
            3.0 * cm,
            2.5 * cm,
            3.0 * cm,
            4.5 * cm
        ]
    )

    transaction_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.lightgrey
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold"
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.4,
                colors.grey
            ),
            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                8
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP"
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                4
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                4
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                5
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                5
            )
        ])
    )

    elements.append(transaction_table)

    # -------------------------
    # BUILD PDF
    # -------------------------

    doc.build(elements)

    pdf_bytes = buffer.getvalue()
    buffer.close()

    return pdf_bytes


# -------------------------
# REPORT UI
# -------------------------

def render_reports(expenses):

    st.divider()
    st.title("📄 SpendWise Reports")
    st.caption(
        "Export your monthly expenses as a spreadsheet or formatted PDF report."
    )
    if not expenses:
        st.info("No expenses available to export.")
        return
    available_months = sorted(
        {
            expense["date"][:7]
            for expense in expenses
        },
        reverse=True
        )
    selected_report_month = st.selectbox(
        "Select Report Month",
        available_months,
        format_func=lambda month: datetime.strptime(
            month,
            "%Y-%m"
        ).strftime("%B %Y"),
        key="report_month"
    )
    report_month_display = datetime.strptime(
        selected_report_month,
        "%Y-%m"
    ).strftime("%B %Y")
    report_month_name = datetime.strptime(
        selected_report_month,
        "%Y-%m"
    ).strftime("%B_%Y")
    report_expenses = [
        expense
        for expense in expenses
        if expense["date"].startswith(selected_report_month)
    ]
    
    if not report_expenses:
        st.info("No expenses available for the selected month.")
        return

    st.caption(
        f"{len(report_expenses)} transactions available for "
        f"{report_month_display}"
    )

    st.divider()

    export_col1, export_col2 = st.columns(
        2,
        border=True
    )

    # -------------------------
    # CSV EXPORT CARD
    # -------------------------

    with export_col1:

        st.markdown("### 📊 CSV Export")

        st.write(
            "Download your expense data in spreadsheet format."
        )

        st.caption(
            "Best for Excel, Google Sheets, filtering, and further analysis."
        )

        report_df = pd.DataFrame(report_expenses)

        if "date" in report_df.columns:
            report_df["date"] = pd.to_datetime(
                report_df["date"]
            ).dt.strftime("%d %b %Y")

        csv_data = report_df.to_csv(
            index=False
        ).encode("utf-8")

        st.download_button(
            label="⬇️ Download CSV",
            data=csv_data,
            file_name=(
                f"spendwise_{report_month_name}_expenses.csv"
            ),
            mime="text/csv",
            key="download_csv_report",
            width="stretch"
        )


# -------------------------
# PDF EXPORT CARD
# -------------------------

    with export_col2:

        st.markdown("### 📄 PDF Report")

        st.write(
            "Download a clean formatted monthly expense report."
        )

        st.caption(
            "Best for sharing, printing, submissions, and record keeping."
        )

        st.download_button(
            label="📄 Download PDF Report",
            data=generate_pdf_report(report_expenses),
            file_name=(
                f"spendwise_{report_month_name}_expense_report.pdf"
            ),
            mime="application/pdf",
            key="download_pdf_report",
            on_click="ignore",
            width="stretch"
        )