package com.vpfa.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.*
import com.vpfa.app.ui.components.AddTransactionDialog
import com.vpfa.app.ui.components.GlassCard
import com.vpfa.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionsScreen(
    apiService: ApiService,
    onNavigateToDashboard: () -> Unit,
    onNavigateToHealth: () -> Unit,
    onNavigateToInvestments: () -> Unit
) {
    var activeTab by remember { mutableStateOf("istoric") } // "istoric" sau "abonamente"

    // Stări Tranzacții
    var transactions by remember { mutableStateOf<List<Transaction>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedTip by remember { mutableStateOf("") } // "" (toate), "venit", "cheltuiala"
    var selectedCat by remember { mutableStateOf("") } // "" (toate), sau categorie specifică

    // Stări Abonamente
    var subscriptions by remember { mutableStateOf<List<Subscription>>(emptyList()) }

    var isLoading by remember { mutableStateOf(true) }
    var errorMessage by remember { mutableStateOf("") }

    var showAddTxDialog by remember { mutableStateOf(false) }
    var showAddSubDialog by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    val categories = listOf("Mâncare", "Chirie", "Utilități", "Transport", "Divertisment", "Sănătate", "Investiții", "Altele")

    // Încărcare date
    fun loadTransactions() {
        isLoading = true
        coroutineScope.launch {
            try {
                val tipParam = selectedTip.ifEmpty { null }
                val catParam = selectedCat.ifEmpty { null }
                val searchParam = searchQuery.ifEmpty { null }
                transactions = apiService.getTransactions(tipParam, catParam, searchParam)
            } catch (e: Exception) {
                errorMessage = e.message ?: "Eroare la preluarea tranzacțiilor."
            } finally {
                isLoading = false
            }
        }
    }

    fun loadSubscriptions() {
        isLoading = true
        coroutineScope.launch {
            try {
                subscriptions = apiService.getSubscriptions()
            } catch (e: Exception) {
                errorMessage = e.message ?: "Eroare la preluarea abonamentelor."
            } finally {
                isLoading = false
            }
        }
    }

    // Declansam incarcarea cand se schimba filtrele sau tabul activ
    LaunchedEffect(activeTab, selectedTip, selectedCat) {
        if (activeTab == "istoric") {
            loadTransactions()
        } else {
            loadSubscriptions()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Jurnal Finanțe", color = TextPrimary, fontWeight = FontWeight.Bold)
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
                    icon = { Icon(Icons.Default.ReceiptLong, contentDescription = null) },
                    label = { Text("Tranzacții") },
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
                onClick = {
                    if (activeTab == "istoric") {
                        showAddTxDialog = true
                    } else {
                        showAddSubDialog = true
                    }
                },
                containerColor = Primary,
                contentColor = BgMain
            ) {
                Icon(Icons.Default.Add, contentDescription = "Adaugă")
            }
        },
        containerColor = BgMain
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Tab Selector Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, BorderColor, RoundedCornerShape(8.dp))
                    .background(BgSidebar, RoundedCornerShape(8.dp))
                    .padding(4.dp)
            ) {
                listOf(
                    "istoric" to "Istoric Tranzacții",
                    "abonamente" to "Abonamente & Plăți"
                ).forEach { (tabId, label) ->
                    val isSelected = activeTab == tabId
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                color = if (isSelected) Primary else Color.Transparent,
                                shape = RoundedCornerShape(6.dp)
                            )
                            .clickable { activeTab = tabId }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            color = if (isSelected) BgMain else TextSecondary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Erori
            if (errorMessage.isNotEmpty()) {
                Surface(
                    color = Color(0x33FF6F69),
                    border = BorderStroke(1.dp, Warning),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {
                    Text(
                        text = errorMessage,
                        color = Warning,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            if (isLoading && transactions.isEmpty() && subscriptions.isEmpty()) {
                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Primary)
                }
            } else {
                if (activeTab == "istoric") {
                    // Căutare și Filtre
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Caută tranzacție...", color = TextMuted) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { 
                                        searchQuery = ""
                                        loadTransactions()
                                    }) {
                                        Icon(Icons.Default.Close, contentDescription = null, tint = TextMuted)
                                    }
                                } else {
                                    IconButton(onClick = { loadTransactions() }) {
                                        Icon(Icons.Default.Send, contentDescription = null, tint = Primary)
                                    }
                                }
                            },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary,
                                focusedBorderColor = Primary,
                                unfocusedBorderColor = BorderColor
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // Filtru Tip (Dropdown)
                            var typeMenuExpanded by remember { mutableStateOf(false) }
                            Box(modifier = Modifier.weight(1f)) {
                                Button(
                                    onClick = { typeMenuExpanded = true },
                                    colors = ButtonDefaults.buttonColors(containerColor = BgCard),
                                    border = BorderStroke(1.dp, BorderColor),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(
                                        text = when (selectedTip) {
                                            "venit" -> "Venituri"
                                            "cheltuiala" -> "Cheltuieli"
                                            else -> "Tipurile"
                                        },
                                        color = TextSecondary,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                                DropdownMenu(
                                    expanded = typeMenuExpanded,
                                    onDismissRequest = { typeMenuExpanded = false },
                                    modifier = Modifier.background(BgSidebar).border(1.dp, BorderColor)
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("Tipurile", color = TextPrimary) },
                                        onClick = {
                                            selectedTip = ""
                                            typeMenuExpanded = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Venituri", color = TextPrimary) },
                                        onClick = {
                                            selectedTip = "venit"
                                            selectedCat = "" // resetam categoria la venit
                                            typeMenuExpanded = false
                                        }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("Cheltuieli", color = TextPrimary) },
                                        onClick = {
                                            selectedTip = "cheltuiala"
                                            typeMenuExpanded = false
                                        }
                                    )
                                }
                            }

                            // Filtru Categorie (Dropdown) - Afișat doar dacă tipul nu este venit
                            if (selectedTip != "venit") {
                                var catMenuExpanded by remember { mutableStateOf(false) }
                                Box(modifier = Modifier.weight(1f)) {
                                    Button(
                                        onClick = { catMenuExpanded = true },
                                        colors = ButtonDefaults.buttonColors(containerColor = BgCard),
                                        border = BorderStroke(1.dp, BorderColor),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Text(
                                            text = selectedCat.ifEmpty { "Categoriile" },
                                            color = TextSecondary,
                                            fontSize = 12.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    DropdownMenu(
                                        expanded = catMenuExpanded,
                                        onDismissRequest = { catMenuExpanded = false },
                                        modifier = Modifier.background(BgSidebar).border(1.dp, BorderColor)
                                    ) {
                                        DropdownMenuItem(
                                            text = { Text("Categoriile", color = TextPrimary) },
                                            onClick = {
                                                selectedCat = ""
                                                catMenuExpanded = false
                                            }
                                        )
                                        categories.forEach { cat ->
                                            DropdownMenuItem(
                                                text = { Text(cat, color = TextPrimary) },
                                                onClick = {
                                                    selectedCat = cat
                                                    catMenuExpanded = false
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Lista Tranzacții
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (transactions.isNotEmpty()) {
                            transactions.forEach { tx ->
                                TransactionRowWithDelete(
                                    transaction = tx,
                                    onDelete = {
                                        coroutineScope.launch {
                                            try {
                                                apiService.deleteTransaction(tx.id)
                                                loadTransactions()
                                            } catch (e: Exception) {
                                                errorMessage = e.message ?: "Eroare la ștergere."
                                            }
                                        }
                                    }
                                )
                            }
                        } else {
                            Text(
                                text = "Nicio tranzacție găsită.",
                                color = TextMuted,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                    }
                } else {
                    // Lista Abonamente
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        if (subscriptions.isNotEmpty()) {
                            subscriptions.forEach { sub ->
                                SubscriptionRow(
                                    subscription = sub,
                                    onDelete = {
                                        coroutineScope.launch {
                                            try {
                                                apiService.deleteSubscription(sub.id)
                                                loadSubscriptions()
                                            } catch (e: Exception) {
                                                errorMessage = e.message ?: "Eroare la ștergerea abonamentului."
                                            }
                                        }
                                    }
                                )
                            }
                        } else {
                            Text(
                                text = "Niciun abonament înregistrat.",
                                color = TextMuted,
                                fontSize = 14.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp)
                            )
                        }
                        Spacer(modifier = Modifier.height(20.dp))
                    }
                }
            }
        }
    }

    // Dialog Adăugare Tranzacție
    if (showAddTxDialog) {
        AddTransactionDialog(
            onDismiss = { showAddTxDialog = false },
            onSave = { sumaValue, tipVal, cat, desc ->
                showAddTxDialog = false
                isLoading = true
                coroutineScope.launch {
                    try {
                        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                        val currentIsoString = sdf.format(Date())

                        apiService.createTransaction(
                            TransactionCreateRequest(
                                suma = sumaValue,
                                tip = tipVal,
                                categorie = cat,
                                descriere = desc,
                                data = currentIsoString,
                                sursa = "Manual"
                            )
                        )
                        loadTransactions()
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Eroare la adăugarea tranzacției."
                    } finally {
                        isLoading = false
                    }
                }
            }
        )
    }

    // Dialog Adăugare Abonament
    if (showAddSubDialog) {
        AddSubscriptionDialog(
            onDismiss = { showAddSubDialog = false },
            onSave = { numeVal, sumaVal, catVal, ziVal ->
                showAddSubDialog = false
                isLoading = true
                coroutineScope.launch {
                    try {
                        apiService.createSubscription(
                            SubscriptionCreateRequest(
                                nume = numeVal,
                                suma = sumaVal,
                                categorie = catVal,
                                ziPlata = ziVal
                            )
                        )
                        loadSubscriptions()
                    } catch (e: Exception) {
                        errorMessage = e.message ?: "Eroare la adăugarea abonamentului."
                    } finally {
                        isLoading = false
                    }
                }
            }
        )
    }
}

@Composable
fun TransactionRowWithDelete(
    transaction: Transaction,
    onDelete: () -> Unit
) {
    val isExpense = transaction.tip == "cheltuiala"
    val color = if (isExpense) Warning else Success
    val sign = if (isExpense) "-" else "+"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                width = 1.dp,
                color = if (transaction.esteAnomala) Color(0x80FF6F69) else BorderColor,
                shape = RoundedCornerShape(8.dp)
            )
            .background(
                color = if (transaction.esteAnomala) Color(0x0CFF6F69) else Color(0x05FFFFFF),
                shape = RoundedCornerShape(8.dp)
            )
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
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = transaction.categorie.replaceFirstChar { if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() },
                        color = TextPrimary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (transaction.esteAnomala) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Surface(
                            color = Color(0x1EFF6F69),
                            border = BorderStroke(1.dp, Warning),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                "ANOMALIE ML",
                                color = Warning,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Text(
                    text = transaction.descriere.ifEmpty { "Manual" },
                    color = TextMuted,
                    fontSize = 10.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "$sign${transaction.suma} RON",
                color = color,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold
            )
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Șterge",
                    tint = TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

@Composable
fun SubscriptionRow(
    subscription: Subscription,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, BorderColor, RoundedCornerShape(10.dp))
            .background(Color(0x06FFFFFF), RoundedCornerShape(10.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f)
        ) {
            Surface(
                color = Color(0x1EC5E384),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = subscription.nume,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    modifier = Modifier.padding(top = 2.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = Color(0x0DFFFFFF),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = subscription.categorie,
                            color = TextSecondary,
                            fontSize = 9.sp,
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                    Text(
                        text = "Ziua de plată: ${subscription.ziPlata}",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }
            }
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "-${subscription.suma.toInt()} RON",
                color = Warning,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(28.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = "Șterge",
                    tint = TextMuted,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddSubscriptionDialog(
    onDismiss: () -> Unit,
    onSave: (nume: String, suma: Double, categorie: String, ziPlata: Int) -> Unit
) {
    var nume by remember { mutableStateOf("") }
    var suma by remember { mutableStateOf("") }
    var categorie by remember { mutableStateOf("Utilități") }
    var ziPlata by remember { mutableStateOf("1") }

    val categories = listOf("Utilități", "Chirie", "Mâncare", "Transport", "Divertisment", "Sănătate", "Investiții", "Altele")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Adaugă Abonament",
                color = TextPrimary,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = nume,
                    onValueChange = { nume = it },
                    label = { Text("Nume Serviciu / Abonament", color = TextSecondary) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = suma,
                    onValueChange = { suma = it },
                    label = { Text("Suma Lunară (RON)", color = TextSecondary) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                // Categorie Selector (Dropdown)
                var catMenuExpanded by remember { mutableStateOf(false) }
                Column {
                    Text("Categorie:", color = TextSecondary, fontSize = 13.sp, modifier = Modifier.padding(bottom = 4.dp))
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = { catMenuExpanded = true },
                            colors = ButtonDefaults.buttonColors(containerColor = BgCard),
                            border = BorderStroke(1.dp, BorderColor),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(categorie, color = TextPrimary, fontSize = 13.sp)
                        }
                        DropdownMenu(
                            expanded = catMenuExpanded,
                            onDismissRequest = { catMenuExpanded = false },
                            modifier = Modifier.background(BgSidebar).border(1.dp, BorderColor).fillMaxWidth(0.8f)
                        ) {
                            categories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat, color = TextPrimary) },
                                    onClick = {
                                        categorie = cat
                                        catMenuExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = ziPlata,
                    onValueChange = { ziPlata = it },
                    label = { Text("Zi de plată (1-31)", color = TextSecondary) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sDouble = suma.toDoubleOrNull()
                    val zInt = ziPlata.toIntOrNull()
                    if (nume.trim().isNotEmpty() && sDouble != null && sDouble > 0 && zInt != null && zInt in 1..31) {
                        onSave(nume.trim(), sDouble, categorie, zInt)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Salvează", color = BgMain, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Anulează", color = Warning)
            }
        },
        containerColor = BgSidebar,
        modifier = Modifier.padding(16.dp)
    )
}
