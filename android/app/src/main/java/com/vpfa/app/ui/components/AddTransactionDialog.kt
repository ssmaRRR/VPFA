package com.vpfa.app.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionDialog(
    onDismiss: () -> Unit,
    onSave: (suma: Double, tip: String, categorie: String, descriere: String) -> Unit
) {
    var suma by remember { mutableStateOf("") }
    var tip by remember { mutableStateOf("cheltuiala") } // "cheltuiala" sau "venit"
    var categorie by remember { mutableStateOf("Mâncare") }
    var descriere by remember { mutableStateOf("") }

    val categoriesExpense = listOf("Mâncare", "Transport", "Divertisment", "Utilități", "Sănătate", "Chirie", "Investiții", "Altele")
    val categoriesIncome = listOf("Salariu", "Freelance", "Investiții", "Cadou", "Altele")

    // Ajustăm categoria selectată dacă tipul se schimbă
    LaunchedEffect(tip) {
        categorie = if (tip == "cheltuiala") categoriesExpense.first() else categoriesIncome.first()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Adaugă Tranzacție",
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
                // Suma
                OutlinedTextField(
                    value = suma,
                    onValueChange = { suma = it },
                    label = { Text("Sumă (RON)", color = TextSecondary) },
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

                // Tip Selector (Row of 2 selectable boxes/buttons)
                Text("Tip tranzacție:", color = TextSecondary, fontSize = 13.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    val types = listOf(
                        "cheltuiala" to "Cheltuială",
                        "venit" to "Venit"
                    )
                    types.forEach { (typeVal, typeLabel) ->
                        val isSelected = tip == typeVal
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .clickable { tip = typeVal }
                                .border(
                                    1.dp,
                                    if (isSelected) Primary else BorderColor,
                                    RoundedCornerShape(8.dp)
                                ),
                            color = if (isSelected) Color(0x1EC5E384) else Color.Transparent,
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Box(
                                modifier = Modifier.padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = typeLabel,
                                    color = if (isSelected) Primary else TextSecondary,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // Categorie Selector (Grid of Chips)
                Text("Categorie:", color = TextSecondary, fontSize = 13.sp)
                val currentCats = if (tip == "cheltuiala") categoriesExpense else categoriesIncome
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    val chunkSize = 3
                    currentCats.chunked(chunkSize).forEach { chunk ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            chunk.forEach { cat ->
                                val isSelected = categorie == cat
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { categorie = cat }
                                        .border(
                                            1.dp,
                                            if (isSelected) Secondary else BorderColor,
                                            RoundedCornerShape(18.dp)
                                        ),
                                    color = if (isSelected) Color(0x1EA8E6CF) else Color.Transparent,
                                    shape = RoundedCornerShape(18.dp)
                                ) {
                                    Box(
                                        modifier = Modifier.padding(vertical = 6.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = cat,
                                            color = if (isSelected) Secondary else TextSecondary,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }
                            if (chunk.size < chunkSize) {
                                repeat(chunkSize - chunk.size) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }

                // Descriere
                OutlinedTextField(
                    value = descriere,
                    onValueChange = { descriere = it },
                    label = { Text("Descriere (opțional)", color = TextSecondary) },
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
                    if (sDouble != null && sDouble > 0) {
                        onSave(sDouble, tip, categorie, descriere)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Primary)
            ) {
                Text("Adaugă", color = BgMain, fontWeight = FontWeight.Bold)
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
