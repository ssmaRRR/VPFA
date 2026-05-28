package com.vpfa.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.vpfa.app.api.RetrofitClient
import com.vpfa.app.data.TokenStorage
import com.vpfa.app.ui.screens.*
import com.vpfa.app.ui.theme.BgMain
import com.vpfa.app.ui.theme.VPFATheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            VPFATheme {
                val navController = rememberNavController()
                val tokenStorage = remember { TokenStorage(applicationContext) }
                val apiService = remember { RetrofitClient.getApiService(applicationContext) }

                // Verificăm dacă avem deja o sesiune activă (token salvat)
                val startDestination = if (tokenStorage.hasToken()) "dashboard" else "login"

                Surface(color = BgMain) {
                    NavHost(navController = navController, startDestination = startDestination) {
                        composable("login") {
                            LoginScreen(
                                apiService = apiService,
                                tokenStorage = tokenStorage,
                                onLoginSuccess = {
                                    navController.navigate("dashboard") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                },
                                onNavigateToRegister = {
                                    navController.navigate("register")
                                }
                            )
                        }

                        composable("register") {
                            RegisterScreen(
                                apiService = apiService,
                                onRegisterSuccess = {
                                    navController.navigate("login") {
                                        popUpTo("register") { inclusive = true }
                                    }
                                },
                                onNavigateToLogin = {
                                    navController.navigate("login")
                                }
                            )
                        }

                        composable("dashboard") {
                            DashboardScreen(
                                apiService = apiService,
                                onLogout = {
                                    tokenStorage.clearToken()
                                    navController.navigate("login") {
                                        popUpTo("dashboard") { inclusive = true }
                                    }
                                },
                                onNavigateToTransactions = {
                                    navController.navigate("transactions")
                                },
                                onNavigateToHealth = {
                                    navController.navigate("health")
                                },
                                onNavigateToInvestments = {
                                    navController.navigate("investments")
                                }
                            )
                        }

                        composable("transactions") {
                            TransactionsScreen(
                                apiService = apiService,
                                onNavigateToDashboard = {
                                    navController.navigate("dashboard")
                                },
                                onNavigateToHealth = {
                                    navController.navigate("health")
                                },
                                onNavigateToInvestments = {
                                    navController.navigate("investments")
                                }
                            )
                        }

                        composable("health") {
                            PredictiveHealthScreen(
                                apiService = apiService,
                                onNavigateToDashboard = {
                                    navController.navigate("dashboard")
                                },
                                onNavigateToTransactions = {
                                    navController.navigate("transactions")
                                },
                                onNavigateToInvestments = {
                                    navController.navigate("investments")
                                }
                            )
                        }

                        composable("investments") {
                            InvestmentScreen(
                                apiService = apiService,
                                onNavigateToDashboard = {
                                    navController.navigate("dashboard")
                                },
                                onNavigateToTransactions = {
                                    navController.navigate("transactions")
                                },
                                onNavigateToHealth = {
                                    navController.navigate("health")
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
