package com.vpfa.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.ApiService
import com.vpfa.app.api.InvestmentResponse
import com.vpfa.app.ui.components.GlassCard
import com.vpfa.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvestmentScreen(
    apiService: ApiService,
    onNavigateToDashboard: () -> Unit,
    onNavigateToTransactions: () -> Unit,
    onNavigateToHealth: () -> Unit
) {
    var investments by remember { mutableStateOf<InvestmentResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf("") }
    
    // State pentru a arăta/ascunde explicația clusterului ML (K-Means) la apăsare
    var showClusterExplanation by remember { mutableStateOf(false) }
    
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    LaunchedEffect(Unit) {
        coroutineScope.launch {
            try {
                investments = apiService.getInvestments()
            } catch (e: Exception) {
                errorMessage = e.message ?: "Eroare la preluarea recomandărilor."
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Sugestii Investiții", color = TextPrimary, fontWeight = FontWeight.Bold)
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BgSidebar)
            )
        },
        bottomBar = {
            NavigationBar(containerColor = BgSidebar) {
                NavigationBarItem(
                    selected = false,
                    onClick = onNavigateToDashboard,
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = null) },
                    label = { Text("Panou Control") },
                    colors = NavigationBarItemDefaults.colors(
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
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.TrendingUp, contentDescription = null) },
                    label = { Text("Investiții ML") },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = BgMain,
                        selectedTextColor = Primary,
                        indicatorColor = Primary,
                        unselectedIconColor = TextMuted,
                        unselectedTextColor = TextMuted
                    )
                )
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

                investments?.let { inv ->
                    // 1. Profil recomandat de K-Means
                    GlassCard {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = inv.profilNume,
                                color = Secondary,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f)
                            )
                            
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.clickable { showClusterExplanation = !showClusterExplanation }
                            ) {
                                Surface(
                                    color = Color(0x1E5CDB95),
                                    border = BorderStroke(1.dp, Color(0x405CDB95)),
                                    shape = RoundedCornerShape(20.dp)
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Shield,
                                            contentDescription = null,
                                            tint = Success,
                                            modifier = Modifier.size(12.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = "Cluster ${inv.cluster}",
                                            color = Success,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = "Explicație Cluster",
                                    tint = Primary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }

                        // Explicație K-Means dinamică (toggled via State la tap)
                        AnimatedVisibility(
                            visible = showClusterExplanation,
                            enter = expandVertically(),
                            exit = shrinkVertically()
                        ) {
                            Surface(
                                color = BgSidebar,
                                border = BorderStroke(1.dp, BorderColorGlow),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = "Explicație Algoritm ML (K-Means):",
                                        color = Primary,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(bottom = 4.dp)
                                    )
                                    Text(
                                        text = when(inv.cluster) {
                                            0 -> "Cluster 0 grupează utilizatorii cu o vârstă mai ridicată, venituri moderate, o rată mai mică de economisire sau o aversiune declarată la risc, prioritizând protejarea capitalului."
                                            1 -> "Cluster 1 grupează utilizatorii activi, cu venituri stabile și o rată de economisire echilibrată, care acceptă o volatilitate medie pentru a obține o creștere treptată a capitalului."
                                            else -> "Cluster 2 grupează utilizatorii tineri, cu un orizont mare de timp, venituri ridicate sau o rată mare de economisire, dispuși să își asume riscuri mari pentru randamente maxime pe termen lung."
                                        },
                                        color = TextPrimary,
                                        fontSize = 11.sp,
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }

                        Divider(color = BorderColor, modifier = Modifier.padding(bottom = 12.dp))

                        Text(
                            text = inv.descriere,
                            color = TextSecondary,
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // 2. Alocare active și sume absolute
                    GlassCard(title = "Alocare Active & Bugetare") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Donut Chart
                            Box(
                                modifier = Modifier.weight(1f).height(140.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                val colors = listOf(Primary, Secondary, Success, Amber, Color(0xFF8E8680))
                                Canvas(modifier = Modifier.size(100.dp)) {
                                    var startAngle = -90f
                                    inv.alocare.forEachIndexed { index, item ->
                                        val sweepAngle = (item.procent.toFloat() / 100f) * 360f
                                        drawArc(
                                            color = colors[index % colors.size],
                                            startAngle = startAngle,
                                            sweepAngle = sweepAngle,
                                            useCenter = false,
                                            style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Butt)
                                        )
                                        startAngle += sweepAngle
                                    }
                                }
                                Text(
                                    text = "Portofoliu",
                                    color = TextPrimary,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Spacer(modifier = Modifier.width(16.dp))

                            // Lista sume detaliată
                            Column(
                                modifier = Modifier.weight(1.3f),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val colors = listOf(Primary, Secondary, Success, Amber, Color(0xFF8E8680))
                                inv.alocare.forEachIndexed { index, item ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .background(colors[index % colors.size], RoundedCornerShape(50))
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column {
                                            Text(
                                                text = item.clasaActive,
                                                color = TextPrimary,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                maxLines = 1
                                            )
                                            Text(
                                                text = "${String.format("%,.2f", item.valoareEstimata)} RON (${item.procent}%)",
                                                color = TextSecondary,
                                                fontSize = 10.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // 3. Instrucțiuni de implementare
                    GlassCard(title = "Instrucțiuni Implementare") {
                        Row(
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.MonetizationOn,
                                contentDescription = null,
                                tint = Secondary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = inv.recomandareDetaliata,
                                color = TextPrimary,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
