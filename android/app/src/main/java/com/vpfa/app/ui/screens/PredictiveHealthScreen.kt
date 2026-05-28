package com.vpfa.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.ApiService
import com.vpfa.app.api.ForecastResponse
import com.vpfa.app.ui.components.GlassCard
import com.vpfa.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PredictiveHealthScreen(
    apiService: ApiService,
    onNavigateToDashboard: () -> Unit,
    onNavigateToInvestments: () -> Unit
) {
    var forecast by remember { mutableStateOf<ForecastResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf("") }
    
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    LaunchedEffect(Unit) {
        coroutineScope.launch {
            try {
                forecast = apiService.getForecast()
            } catch (e: Exception) {
                errorMessage = e.message ?: "Eroare la preluarea prognozei financiare."
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Sănătate Predictivă", color = TextPrimary, fontWeight = FontWeight.Bold)
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
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.Analytics, contentDescription = null) },
                    label = { Text("Sănătate ML") },
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

                forecast?.let { fore ->
                    val hasRunwayIssue = fore.runwayLuni != null
                    val statusColor = if (hasRunwayIssue) Warning else Success
                    val statusBg = if (hasRunwayIssue) Color(0x1EFF6F69) else Color(0x1E5CDB95)
                    val statusBorder = if (hasRunwayIssue) Color(0x40FF6F69) else Color(0x405CDB95)

                    // 1. Diagnoza Inteligentă a Soldului Card (cu borderLeft colorat)
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, BorderColor, RoundedCornerShape(14.dp)),
                        color = BgCard,
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .fillMaxHeight()
                                    .background(statusColor)
                            )
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Diagnoza Inteligentă a Soldului",
                                    color = TextPrimary,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(bottom = 12.dp)
                                )

                                Row(
                                    verticalAlignment = Alignment.Top,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    // Status icon container
                                    Surface(
                                        color = statusBg,
                                        border = BorderStroke(1.dp, statusBorder),
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.size(54.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = if (hasRunwayIssue) Icons.Default.Warning else Icons.Default.CheckCircle,
                                                contentDescription = null,
                                                tint = statusColor,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.width(16.dp))

                                    // Content details
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = if (hasRunwayIssue) "Tendință de Scădere a Soldului" else "Stare Financiară Pozitivă",
                                            color = TextPrimary,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(bottom = 6.dp)
                                        )
                                        Text(
                                            text = fore.mesajSanatate,
                                            color = TextSecondary,
                                            fontSize = 13.sp,
                                            lineHeight = 18.sp,
                                            modifier = Modifier.padding(bottom = 12.dp)
                                        )
                                        
                                        // Runway Badge
                                        Surface(
                                            color = statusBg,
                                            border = BorderStroke(1.dp, statusBorder),
                                            shape = RoundedCornerShape(20.dp),
                                            modifier = Modifier.padding(top = 4.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                            ) {
                                                Icon(
                                                    Icons.Default.HourglassEmpty,
                                                    contentDescription = null,
                                                    tint = statusColor,
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                                Text(
                                                    text = if (hasRunwayIssue) "Rezervă Financiară (Runway): ${fore.runwayLuni} luni" else "Rezervă Financiară: Nelimitat",
                                                    color = statusColor,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    // 2. AI Optimization Recommendations
                    GlassCard(title = "Plan de Optimizare Recomandat de AI") {
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            RecommendationItem(
                                title = "Fondul de Urgență",
                                description = if (hasRunwayIssue)
                                    "Prioritatea ta numărul 1 este să stabilizezi soldul. Oprește transferurile către investiții speculative până când ai strâns echivalentul a 3 luni de cheltuieli."
                                else
                                    "Felicitări pentru economisire! Direcționează surplusul lunar de fonduri într-un cont separat de rezervă, acoperind 3-6 luni de cheltuieli fixe.",
                                icon = Icons.Default.Security,
                                iconColor = Secondary
                            )

                            RecommendationItem(
                                title = "Regula de Aur 50/30/20",
                                description = "Încearcă să îți structurezi veniturile astfel: 50% pentru Necesități (chirie, facturi, mâncare de bază), 30% pentru Dorințe (ieșiri, hobby-uri) și minim 20% pentru Economii și Investiții.",
                                icon = Icons.Default.TrendingUp,
                                iconColor = Secondary
                            )

                            RecommendationItem(
                                title = "Automatizarea Economiilor",
                                description = "Setează o plată recurentă automată în ziua de salariu care să transfere automat ținta ta de economii direct din contul curent în contul de economii sau investiții. Astfel, eviți impulsul de a cheltui banii rămași.",
                                icon = Icons.Default.Autorenew,
                                iconColor = Secondary
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun RecommendationItem(
    title: String,
    description: String,
    icon: ImageVector,
    iconColor: Color
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = iconColor,
            modifier = Modifier.size(20.dp).padding(top = 2.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = title,
                color = TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 2.dp)
            )
            Text(
                text = description,
                color = TextSecondary,
                fontSize = 12.sp,
                lineHeight = 16.sp
            )
        }
    }
}
