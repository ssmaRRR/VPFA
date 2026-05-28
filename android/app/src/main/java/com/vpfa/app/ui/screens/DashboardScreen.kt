package com.vpfa.app.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.ApiService
import com.vpfa.app.api.DashboardSummary
import com.vpfa.app.api.MonthlyTrend
import com.vpfa.app.api.Transaction
import com.vpfa.app.api.UpcomingSubscription
import com.vpfa.app.ui.components.GlassCard
import com.vpfa.app.ui.components.MonthlyTrendsChart
import com.vpfa.app.ui.components.AddTransactionDialog
import com.vpfa.app.ui.theme.*
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    apiService: ApiService,
    onLogout: () -> Unit,
    onNavigateToTransactions: () -> Unit,
    onNavigateToHealth: () -> Unit,
    onNavigateToInvestments: () -> Unit
) {
    var summary by remember { mutableStateOf<DashboardSummary?>(null) }
    var recentTransactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var upcomingSubs by remember { mutableStateOf<List<UpcomingSubscription>>(emptyList()) }
    var trends by remember { mutableStateOf<List<MonthlyTrend>>(emptyList()) }
    
    var isLoading by remember { mutableStateOf(true) }
    var syncLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    fun loadData() {
        isLoading = true
        coroutineScope.launch {
            try {
                summary = apiService.getDashboardSummary()
                recentTransactions = apiService.getTransactions().take(6)
                upcomingSubs = apiService.getUpcomingSubscriptions()
                trends = apiService.getMonthlyTrends()
            } catch (e: Exception) {
                errorMessage = e.message ?: "Eroare la preluarea datelor."
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("VPFA Panou Control", color = TextPrimary, fontWeight = FontWeight.Bold)
                },
                actions = {
                    IconButton(
                        onClick = {
                            syncLoading = true
                            coroutineScope.launch {
                                try {
                                    apiService.syncMockData()
                                    loadData()
                                } catch (e: Exception) {
                                    // Ignorăm erori la sync mock pentru simplitate
                                } finally {
                                    syncLoading = false
                                }
                            }
                        },
                        enabled = !syncLoading
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = "Sincronizează", tint = Primary)
                    }
                    IconButton(onClick = onLogout) {
                        Icon(Icons.Default.ExitToApp, contentDescription = "Deconectare", tint = Warning)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgSidebar)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = BgSidebar) {
                NavigationBarItem(
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = null) },
                    label = { Text("Panou Control") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BgMain,
                        selectedTextColor = Primary,
                        indicatorColor = Primary,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToTransactions,
                    icon = { Icon(Icons.Default.ReceiptLong, contentDescription = null) },
                    label = { Text("Tranzacții") },
                    colors = NavigationBarItemDefaults.colors(
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToHealth,
                    icon = { Icon(Icons.Default.Analytics, contentDescription = null) },
                    label = { Text("Sănătate ML") },
                    colors = NavigationBarItemDefaults.colors(
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToInvestments,
                    icon = { Icon(Icons.Default.TrendingUp, contentDescription = null) },
                    label = { Text("Investiții ML") },
                    colors = NavigationBarItemDefaults.colors(
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
            }
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Primary,
                contentColor = BgMain
            ) {
                Icon(Icons.Default.Add, contentDescription = "Adaugă tranzacție")
            }
        },
        containerColor = BgMain
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().background(BgMain), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Primary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp)
                    .verticalScroll(scrollState)
            ) {
                Spacer(modifier = Modifier.height(16.dp))

                // Grid Indicatori Cheie (Cards layout)
                summary?.let { sum ->
                    SummaryCard(
                        title = "Sold Curent",
                        value = "${String.format("%,.2f", sum.soldCurent)} RON",
                        icon = Icons.Default.AccountBalance,
                        iconColor = Secondary,
                        iconBg = Color(0x1EA8E6CF)
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.weight(1f)) {
                            SummaryCard(
                                title = "Venituri",
                                value = "+${String.format("%,.2f", sum.venituriTotale)} RON",
                                icon = Icons.Default.TrendingUp,
                                iconColor = Success,
                                iconBg = Color(0x1E5CDB95)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            SummaryCard(
                                title = "Cheltuieli",
                                value = "-${String.format("%,.2f", sum.cheltuieliTotale)} RON",
                                icon = Icons.Default.TrendingDown,
                                iconColor = Warning,
                                iconBg = Color(0x1EFF6F69)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.weight(1f)) {
                            SummaryCard(
                                title = "Rată Economisire",
                                value = "${sum.rataEconomisire}%",
                                icon = Icons.Default.Percent,
                                iconColor = Amber,
                                iconBg = Color(0x1EFFFFB3)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Box(modifier = Modifier.weight(1f)) {
                            SummaryCard(
                                title = "Anomalii ML",
                                value = sum.alerteAnomalii.toString(),
                                icon = Icons.Default.Warning,
                                iconColor = if (sum.alerteAnomalii > 0) Warning else TextMuted,
                                iconBg = if (sum.alerteAnomalii > 0) Color(0x33FF6F69) else Color(0x1E8E8680)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))

                    // Evoluție Venituri vs Cheltuieli Chart
                    GlassCard(title = "Evoluție Venituri vs Cheltuieli") {
                        MonthlyTrendsChart(
                            trends = trends,
                            modifier = Modifier.fillMaxWidth().height(180.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Card Combinat Donut & Plăți Recurente
                GlassCard(title = "Distribuția Cheltuielilor & Plăți Recurente") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Stânga: Donut Chart simplificat
                        Box(
                            modifier = Modifier
                                .weight(1.2f)
                                .height(160.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            val expenses = recentTransactions.filter { it.tip == "cheltuiala" }
                            val categorySums = expenses.groupBy { it.categorie }
                                .mapValues { entry -> entry.value.sumOf { it.suma } }
                            val totalExpenses = categorySums.values.sum()

                            if (totalExpenses > 0) {
                                val colors = listOf(Primary, Secondary, Success, Warning, Amber, Color(0xFFEBD5C7), Color(0xFF8E8680))
                                val slices = categorySums.entries.mapIndexed { index, entry ->
                                    DonutSlice(entry.value.toFloat(), colors[index % colors.size])
                                }
                                
                                Canvas(modifier = Modifier.size(110.dp)) {
                                    var startAngle = -90f
                                    slices.forEach { slice ->
                                        val sweepAngle = (slice.value / totalExpenses.toFloat()) * 360f
                                        drawArc(
                                            color = slice.color,
                                            startAngle = startAngle,
                                            sweepAngle = sweepAngle,
                                            useCenter = false,
                                            style = Stroke(width = 16.dp.toPx(), cap = StrokeCap.Butt)
                                        )
                                        startAngle += sweepAngle
                                    }
                                }
                                
                                Text(
                                    text = "Cheltuieli",
                                    color = TextPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            } else {
                                Text(
                                    text = "Fără date",
                                    color = TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        // Dreapta: Următoarele plăți recurente (maxHeight = 160.dp cu scroll vertical)
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .height(160.dp)
                        ) {
                            Text(
                                text = "Plăți Recurente",
                                color = TextPrimary,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                if (upcomingSubs.isNotEmpty()) {
                                    upcomingSubs.take(4).forEach { sub ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .border(1.dp, BorderColor, RoundedCornerShape(6.dp))
                                                .background(Color(0x0AFFFFFF))
                                                .padding(6.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = sub.nume,
                                                    color = TextPrimary,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                                Text(
                                                    text = "Ziua ${sub.ziPlata}",
                                                    color = TextMuted,
                                                    fontSize = 9.sp
                                                )
                                            }
                                            Text(
                                                text = "-${sub.suma.toInt()} RON",
                                                color = Warning,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                } else {
                                    Text(
                                        text = "Fără plăți programate în 7 zile",
                                        color = TextMuted,
                                        fontSize = 10.sp,
                                        modifier = Modifier.padding(top = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Card Tranzacții Recente
                GlassCard(title = "Tranzacții Recente") {
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (recentTransactions.isNotEmpty()) {
                            recentTransactions.forEach { tx ->
                                TransactionRow(transaction = tx)
                            }
                        } else {
                            Text(
                                text = "Nicio tranzacție salvată.",
                                color = TextMuted,
                                fontSize = 13.sp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center
                            )
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }

    if (showAddDialog) {
        AddTransactionDialog(
            onDismiss = { showAddDialog = false },
            onSave = { sumaValue, tipVal, cat, desc ->
                showAddDialog = false
                isLoading = true
                coroutineScope.launch {
                    try {
                        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
                        val currentIsoString = sdf.format(java.util.Date())

                        apiService.createTransaction(
                            com.vpfa.app.api.TransactionCreateRequest(
                                suma = sumaValue,
                                tip = tipVal,
                                categorie = cat,
                                descriere = desc,
                                data = currentIsoString,
                                sursa = "Manual"
                            )
                        )
                        loadData()
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Eroare la adăugarea tranzacției."
                    } finally {
                        isLoading = false
                    }
                }
            }
        )
    }
}

data class DonutSlice(val value: Float, val color: Color)

@Composable
fun SummaryCard(
    title: String,
    value: String,
    icon: ImageVector,
    iconColor: Color,
    iconBg: Color
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderColor, RoundedCornerShape(14.dp)),
        color = BgCard,
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                color = iconBg,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.size(44.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(text = title, color = TextSecondary, fontSize = 12.sp)
                Text(text = value, color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun TransactionRow(transaction: Transaction) {
    val isExpense = transaction.tip == "cheltuiala"
    val color = if (isExpense) Warning else Success
    val sign = if (isExpense) "-" else "+"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderColor, RoundedCornerShape(8.dp))
            .background(Color(0x05FFFFFF))
            .padding(10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Surface(
                color = if (isExpense) Color(0x0DFF6F69) else Color(0x0D5CDB95),
                shape = RoundedCornerShape(6.dp),
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = if (isExpense) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = transaction.categorie.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() },
                    color = TextPrimary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = transaction.descriere.ifEmpty { "Manual" },
                    color = TextMuted,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        Text(
            text = "$sign${transaction.suma} RON",
            color = color,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

