package com.vpfa.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.MonthlyTrend
import com.vpfa.app.api.HistoricalPoint
import com.vpfa.app.api.ForecastPoint
import com.vpfa.app.ui.theme.*

// 1. Chart pentru Evoluție Venituri vs Cheltuieli (Dashboard)
@Composable
fun MonthlyTrendsChart(
    trends: List<MonthlyTrend>,
    modifier: Modifier = Modifier.fillMaxWidth().height(200.dp)
) {
    if (trends.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text("Nu există date suficiente pentru grafic.", color = TextMuted, fontSize = 12.sp)
        }
        return
    }

    val maxVal = (trends.maxOfOrNull { maxOf(it.venituri, it.cheltuieli) } ?: 1.0).toFloat().coerceAtLeast(1f)
    
    val colorIncome = Success
    val colorExpense = Color(0xFFEBD5C7)

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val paddingLeft = 20f
        val paddingRight = 20f
        val paddingTop = 20f
        val paddingBottom = 20f

        val chartWidth = width - paddingLeft - paddingRight
        val chartHeight = height - paddingTop - paddingBottom

        // Draw horizontal grid lines (3 lines)
        val gridLines = 3
        for (i in 0..gridLines) {
            val y = paddingTop + (chartHeight / gridLines) * i
            drawLine(
                color = Color(0x0FFFFFFF),
                start = Offset(paddingLeft, y),
                end = Offset(width - paddingRight, y),
                strokeWidth = 1.dp.toPx()
            )
        }

        // Calculate points
        val xDelta = chartWidth / (trends.size - 1).coerceAtLeast(1)
        
        val incomePoints = trends.mapIndexed { index, trend ->
            val x = paddingLeft + index * xDelta
            val y = paddingTop + chartHeight - (trend.venituri.toFloat() / maxVal) * chartHeight
            Offset(x, y)
        }

        val expensePoints = trends.mapIndexed { index, trend ->
            val x = paddingLeft + index * xDelta
            val y = paddingTop + chartHeight - (trend.cheltuieli.toFloat() / maxVal) * chartHeight
            Offset(x, y)
        }

        // Draw Income Area & Line
        val incomePath = Path().apply {
            if (incomePoints.isNotEmpty()) {
                moveTo(incomePoints.first().x, incomePoints.first().y)
                for (i in 1 until incomePoints.size) {
                    lineTo(incomePoints[i].x, incomePoints[i].y)
                }
            }
        }
        
        val incomeAreaPath = Path().apply {
            if (incomePoints.isNotEmpty()) {
                moveTo(paddingLeft, paddingTop + chartHeight)
                for (point in incomePoints) {
                    lineTo(point.x, point.y)
                }
                lineTo(incomePoints.last().x, paddingTop + chartHeight)
                close()
            }
        }

        // Draw Expense Area & Line
        val expensePath = Path().apply {
            if (expensePoints.isNotEmpty()) {
                moveTo(expensePoints.first().x, expensePoints.first().y)
                for (i in 1 until expensePoints.size) {
                    lineTo(expensePoints[i].x, expensePoints[i].y)
                }
            }
        }

        val expenseAreaPath = Path().apply {
            if (expensePoints.isNotEmpty()) {
                moveTo(paddingLeft, paddingTop + chartHeight)
                for (point in expensePoints) {
                    lineTo(point.x, point.y)
                }
                lineTo(expensePoints.last().x, paddingTop + chartHeight)
                close()
            }
        }

        // Draw Gradients under paths
        drawPath(
            path = incomeAreaPath,
            brush = Brush.verticalGradient(
                colors = listOf(colorIncome.copy(alpha = 0.15f), Color.Transparent),
                startY = paddingTop,
                endY = paddingTop + chartHeight
            )
        )

        drawPath(
            path = expenseAreaPath,
            brush = Brush.verticalGradient(
                colors = listOf(colorExpense.copy(alpha = 0.15f), Color.Transparent),
                startY = paddingTop,
                endY = paddingTop + chartHeight
            )
        )

        // Draw actual lines
        drawPath(
            path = incomePath,
            color = colorIncome,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )

        drawPath(
            path = expensePath,
            color = colorExpense,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )
    }
}

// 2. Chart pentru Sănătate Predictivă (Evoluție Sold + Prognoză)
@Composable
fun ForecastLineChart(
    historical: List<HistoricalPoint>,
    forecast: List<ForecastPoint>,
    modifier: Modifier = Modifier.fillMaxWidth().height(200.dp)
) {
    if (historical.isEmpty() && forecast.isEmpty()) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text("Fără date pentru prognoză.", color = TextMuted, fontSize = 12.sp)
        }
        return
    }

    val allVal = (historical.map { it.soldEstimat } + forecast.map { it.soldEstimat })
    val maxVal = (allVal.maxOrNull() ?: 1.0).toFloat()
    val minVal = (allVal.minOrNull() ?: 0.0).toFloat()
    val range = (maxVal - minVal).coerceAtLeast(1f)

    val colorHistory = Success
    val colorForecast = Amber

    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val paddingLeft = 20f
        val paddingRight = 20f
        val paddingTop = 20f
        val paddingBottom = 20f

        val chartWidth = width - paddingLeft - paddingRight
        val chartHeight = height - paddingTop - paddingBottom

        // Draw horizontal grid lines
        val gridLines = 3
        for (i in 0..gridLines) {
            val y = paddingTop + (chartHeight / gridLines) * i
            drawLine(
                color = Color(0x0FFFFFFF),
                start = Offset(paddingLeft, y),
                end = Offset(width - paddingRight, y),
                strokeWidth = 1.dp.toPx()
            )
        }

        val totalPoints = historical.size + forecast.size
        val xDelta = chartWidth / (totalPoints - 1).coerceAtLeast(1)

        // Compute points for history
        val historyPoints = historical.mapIndexed { index, point ->
            val x = paddingLeft + index * xDelta
            val y = paddingTop + chartHeight - ((point.soldEstimat.toFloat() - minVal) / range) * chartHeight
            Offset(x, y)
        }

        // Compute points for forecast (start index is historical.size - 1 to connect the lines)
        val startIdx = (historical.size - 1).coerceAtLeast(0)
        val forecastPoints = forecast.mapIndexed { index, point ->
            val x = paddingLeft + (startIdx + index) * xDelta
            val y = paddingTop + chartHeight - ((point.soldEstimat.toFloat() - minVal) / range) * chartHeight
            Offset(x, y)
        }

        // Draw History Path
        val historyPath = Path().apply {
            if (historyPoints.isNotEmpty()) {
                moveTo(historyPoints.first().x, historyPoints.first().y)
                for (i in 1 until historyPoints.size) {
                    lineTo(historyPoints[i].x, historyPoints[i].y)
                }
            }
        }

        val historyAreaPath = Path().apply {
            if (historyPoints.isNotEmpty()) {
                moveTo(paddingLeft, paddingTop + chartHeight)
                for (point in historyPoints) {
                    lineTo(point.x, point.y)
                }
                lineTo(historyPoints.last().x, paddingTop + chartHeight)
                close()
            }
        }

        // Draw Forecast Path
        val forecastPath = Path().apply {
            if (forecastPoints.isNotEmpty()) {
                moveTo(forecastPoints.first().x, forecastPoints.first().y)
                for (i in 1 until forecastPoints.size) {
                    lineTo(forecastPoints[i].x, forecastPoints[i].y)
                }
            }
        }

        val forecastAreaPath = Path().apply {
            if (forecastPoints.isNotEmpty()) {
                moveTo(forecastPoints.first().x, paddingTop + chartHeight)
                for (point in forecastPoints) {
                    lineTo(point.x, point.y)
                }
                lineTo(forecastPoints.last().x, paddingTop + chartHeight)
                close()
            }
        }

        // Draw areas
        drawPath(
            path = historyAreaPath,
            brush = Brush.verticalGradient(
                colors = listOf(colorHistory.copy(alpha = 0.15f), Color.Transparent),
                startY = paddingTop,
                endY = paddingTop + chartHeight
            )
        )

        drawPath(
            path = forecastAreaPath,
            brush = Brush.verticalGradient(
                colors = listOf(colorForecast.copy(alpha = 0.1f), Color.Transparent),
                startY = paddingTop,
                endY = paddingTop + chartHeight
            )
        )

        // Draw Solid line for history
        drawPath(
            path = historyPath,
            color = colorHistory,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )

        // Draw Dashed line for forecast
        drawPath(
            path = forecastPath,
            color = colorForecast,
            style = Stroke(
                width = 3.dp.toPx(),
                cap = StrokeCap.Round,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f)
            )
        )
    }
}
