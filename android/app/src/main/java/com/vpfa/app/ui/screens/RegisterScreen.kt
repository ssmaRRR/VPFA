package com.vpfa.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vpfa.app.api.ApiService
import com.vpfa.app.api.UserRegisterRequest
import com.vpfa.app.ui.components.GlassCard
import com.vpfa.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    apiService: ApiService,
    onRegisterSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit
) {
    var nume by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var varsta by remember { mutableStateOf("") }
    var venitLunar by remember { mutableStateOf("") }
    var tolerantaRisc by remember { mutableStateOf("Moderat") }
    var obiectivEconomii by remember { mutableStateOf("") }
    
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf("") }
    
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgMain)
            .padding(24.dp)
            .verticalScroll(scrollState),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)
        ) {
            Text(
                text = "VPFA",
                color = Primary,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                text = "CREARE CONT NOU",
                color = TextSecondary,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 2.sp,
                modifier = Modifier.padding(bottom = 24.dp)
            )

            GlassCard(title = "Înregistrare") {
                if (errorMessage.isNotEmpty()) {
                    Text(
                        text = errorMessage,
                        color = Warning,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                // Name Field
                OutlinedTextField(
                    value = nume,
                    onValueChange = { nume = it },
                    label = { Text("Nume Complet", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                // Email Field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                // Password Field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Parolă", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted) },
                    trailingIcon = {
                        val image = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(image, contentDescription = null, tint = TextMuted)
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                        focusedBorderColor = Primary,
                        unfocusedBorderColor = BorderColor
                    ),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(12.dp))

                // Age Field
                OutlinedTextField(
                    value = varsta,
                    onValueChange = { varsta = it },
                    label = { Text("Vârstă", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = null, tint = TextMuted) },
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
                Spacer(modifier = Modifier.height(12.dp))

                // Income Field
                OutlinedTextField(
                    value = venitLunar,
                    onValueChange = { venitLunar = it },
                    label = { Text("Venit Lunar (RON)", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.AttachMoney, contentDescription = null, tint = TextMuted) },
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
                Spacer(modifier = Modifier.height(12.dp))

                // Savings Target Field
                OutlinedTextField(
                    value = obiectivEconomii,
                    onValueChange = { obiectivEconomii = it },
                    label = { Text("Țintă Economii Lunar (RON)", color = TextSecondary) },
                    leadingIcon = { Icon(Icons.Default.Savings, contentDescription = null, tint = TextMuted) },
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
                Spacer(modifier = Modifier.height(16.dp))

                // Risk Tolerance Selector
                Text("Toleranță Risc:", color = TextSecondary, fontSize = 14.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val riskOptions = listOf("Conservator", "Moderat", "Agresiv")
                    riskOptions.forEach { option ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = (tolerantaRisc == option),
                                onClick = { tolerantaRisc = option },
                                colors = RadioButtonDefaults.colors(selectedColor = Primary, unselectedColor = TextMuted)
                            )
                            Text(option, color = TextPrimary, fontSize = 13.sp)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(24.dp))

                // Submit Button
                Button(
                    onClick = {
                        if (nume.isEmpty() || email.isEmpty() || password.isEmpty() || varsta.isEmpty() || venitLunar.isEmpty() || obiectivEconomii.isEmpty()) {
                            errorMessage = "Te rugăm să completezi toate câmpurile."
                            return@Button
                        }
                        val vInt = varsta.toIntOrNull()
                        val vLDouble = venitLunar.toDoubleOrNull()
                        val oEDouble = obiectivEconomii.toDoubleOrNull()
                        if (vInt == null || vLDouble == null || oEDouble == null) {
                            errorMessage = "Te rugăm să introduci valori numerice valide."
                            return@Button
                        }

                        errorMessage = ""
                        isLoading = true
                        coroutineScope.launch {
                            try {
                                apiService.register(
                                    UserRegisterRequest(
                                        nume = nume,
                                        email = email,
                                        parola = password,
                                        varsta = vInt,
                                        venitLunar = vLDouble,
                                        tolerantaRisc = tolerantaRisc,
                                        obiectivEconomii = oEDouble
                                    )
                                )
                                onRegisterSuccess()
                            } catch (e: Exception) {
                                errorMessage = e.message ?: "Înregistrarea a eșuat. Încearcă din nou."
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = !isLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(color = BgMain, modifier = Modifier.size(24.dp))
                    } else {
                        Text("Înregistrează-te", color = BgMain, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            TextButton(onClick = onNavigateToLogin) {
                Text(
                    text = "Ai deja un cont? Conectează-te →",
                    color = Secondary,
                    fontSize = 14.sp
                )
            }
        }
    }
}
