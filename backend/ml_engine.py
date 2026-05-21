import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Any, Tuple
import models

# =====================================================================
# 1. DETECȚIA ANOMALIILOR (Isolation Forest & Reguli Statistice)
# =====================================================================

def detect_anomalies(transactions: List[models.Transaction]) -> List[Tuple[int, bool, str]]:
    """
    Analizează o listă de tranzacții și returnează o listă de tuple:
    (transaction_id, este_anomala, descriere_anomalie)
    
    Folosește Isolation Forest pentru seturi de date suficiente, 
    și o euristică statistică simplă ca fallback.
    """
    results = []
    if not transactions:
        return results

    # Convertim tranzacțiile în format DataFrame pentru analiză
    data = []
    for t in transactions:
        # Ne concentrăm doar pe cheltuieli pentru detecția anomaliilor de cheltuială
        if t.tip == "cheltuiala":
            data.append({
                "id": t.id,
                "suma": t.suma,
                "categorie": t.categorie,
                "data": t.data,
                "zi_saptamana": t.data.weekday(),
                "zi_luna": t.data.day
            })
            
    if len(data) < 5:
        # Fallback statistic: dacă o cheltuială depășește un prag mare (ex: 5000 RON) 
        # sau este de 3 ori mai mare decât media categoriei ei
        df_simple = pd.DataFrame(data) if data else pd.DataFrame(columns=["id", "suma", "categorie"])
        
        for t in transactions:
            if t.tip != "cheltuiala":
                results.append((t.id, False, None))
                continue
                
            # Regula pragului absolut sau a mediei pe categorie
            if t.suma > 5000:
                results.append((t.id, True, f"Sumă extrem de mare ({t.suma:.2f} RON) depășește limita de alertă."))
            elif len(data) >= 2:
                cat_expenses = [d["suma"] for d in data if d["categorie"] == t.categorie]
                if len(cat_expenses) >= 2:
                    medie = np.mean(cat_expenses)
                    if t.suma > 3 * medie and t.suma > 500:
                        results.append((t.id, True, f"Cheltuială atipică în categoria {t.categorie}: de {t.suma/medie:.1f} ori mai mare decât media."))
                        continue
                results.append((t.id, False, None))
            else:
                results.append((t.id, False, None))
        return results

    df = pd.DataFrame(data)
    
    # Adăugăm categorii numerice prin target encoding simplu sau dummy variables
    df_encoded = pd.get_dummies(df, columns=["categorie"], drop_first=False)
    
    # Caracteristicile pentru Isolation Forest
    features = [col for col in df_encoded.columns if col.startswith("categorie_") or col in ["suma", "zi_saptamana", "zi_luna"]]
    X = df_encoded[features]
    
    # Antrenăm Isolation Forest
    # Contamination setat la 8% din cheltuieli estimate ca anomalii
    clf = IsolationForest(contamination=0.08, random_state=42)
    df["anomaly_label"] = clf.fit_predict(X)
    
    # Mapăm înapoi rezultatele la ID-urile tranzacțiilor
    anomaly_map = {}
    for _, row in df.iterrows():
        t_id = int(row["id"])
        is_anom = row["anomaly_label"] == -1
        
        # Generăm o descriere a anomaliei
        details = None
        if is_anom:
            suma_val = row["suma"]
            cat_name = row["categorie"]
            details = f"Cheltuială neobișnuită identificată de modelul ML Isolation Forest în valoare de {suma_val:.2f} RON la categoria {cat_name}."
            
        anomaly_map[t_id] = (is_anom, details)
        
    for t in transactions:
        if t.tip == "cheltuiala" and t.id in anomaly_map:
            is_anom, details = anomaly_map[t.id]
            results.append((t.id, is_anom, details))
        else:
            results.append((t.id, False, None))
            
    return results


# =====================================================================
# 2. PROGNOZA SĂNĂTĂȚII FINANCIARE (Regresie Liniară pe Trendul de Sold)
# =====================================================================

def forecast_financial_health(
    transactions: List[models.Transaction], 
    current_balance: float, 
    months_to_forecast: int = 3
) -> Dict[str, Any]:
    """
    Calculează istoricul de sold și folosește Regresie Liniară pentru a prezice 
    soldul contului pe următoarele 3 luni.
    Returnează datele istorice, previziunile și o estimare a duratei de viață a economiilor (runway).
    """
    if not transactions:
        # Returnăm o prognoză neutră dacă nu există istoric
        today = datetime.date.today()
        historii = [{"data": (today - datetime.timedelta(days=i)).strftime("%Y-%m-%d"), "sold_estimat": current_balance} for i in range(5, 0, -1)]
        predictii = [{"data": (today + datetime.timedelta(days=i*15)).strftime("%Y-%m-%d"), "sold_estimat": current_balance} for i in range(1, 7)]
        return {
            "istoric": historii,
            "predictie": predictii,
            "runway_luni": None,
            "mesaj_sanatate": "Nu există suficiente tranzacții pentru o analiză predictivă detaliată. Adaugă mai multe tranzacții."
        }

    # Sortăm tranzacțiile după dată
    sorted_txs = sorted(transactions, key=lambda x: x.data)
    
    # Calculăm istoricul soldului pornind de la soldul curent înapoi
    # (sau reconstruim soldul de la 0 la final)
    balance_history = []
    temp_balance = current_balance
    
    # Mergem invers în timp
    balance_history.append((sorted_txs[-1].data.date(), temp_balance))
    for t in reversed(sorted_txs[:-1]):
        if t.tip == "venit":
            temp_balance -= t.suma
        else:
            temp_balance += t.suma
        balance_history.append((t.data.date(), temp_balance))
        
    balance_history.reverse()
    
    # Cream un DataFrame cu soldul zilnic/la fiecare tranzacție
    df_balance = pd.DataFrame(balance_history, columns=["data", "sold"])
    # Grupăm pe zi pentru a avea o singură valoare per zi
    df_balance = df_balance.groupby("data").last().reset_index()
    
    # Transformăm datele în număr de zile de la prima tranzacție (pentru modelul de regresie)
    start_date = df_balance["data"].min()
    df_balance["zile"] = (df_balance["data"] - start_date).apply(lambda x: x.days)
    
    # Antrenăm modelul de Regresie Liniară pe istoricul soldului
    X = df_balance[["zile"]].values
    y = df_balance["sold"].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Generăm punctele de prognoză pentru următoarele 90 de zile (din 15 în 15 zile)
    last_day_index = df_balance["zile"].max()
    forecast_days = [last_day_index + i for i in range(15, 91, 15)]
    X_forecast = np.array(forecast_days).reshape(-1, 1)
    y_forecast = model.predict(X_forecast)
    
    # Pregătim rezultatele istorice pentru grafic (ultimele 10 puncte înregistrate)
    history_points = []
    for _, row in df_balance.tail(15).iterrows():
        history_points.append({
            "data": row["data"].strftime("%Y-%m-%d"),
            "sold_estimat": float(round(row["sold"], 2))
        })
        
    # Pregătim punctele de prognoză
    forecast_points = []
    last_date = df_balance["data"].max()
    for idx, days_offset in enumerate(range(15, 91, 15)):
        f_date = last_date + datetime.timedelta(days=days_offset)
        # Ne asigurăm că prognoza nu scade sub 0 RON (sold minim)
        sold_pred = float(round(max(0.0, y_forecast[idx]), 2))
        forecast_points.append({
            "data": f_date.strftime("%Y-%m-%d"),
            "sold_estimat": sold_pred
        })
        
    # Calculăm media cheltuielilor lunare pentru a calcula runway (dacă soldul scade)
    df_txs = pd.DataFrame([{
        "suma": t.suma,
        "tip": t.tip,
        "luna": t.data.strftime("%Y-%m")
    } for t in transactions])
    
    monthly_expenses = df_txs[df_txs["tip"] == "cheltuiala"].groupby("luna")["suma"].sum()
    medie_cheltuieli_luna = monthly_expenses.mean() if not monthly_expenses.empty else 0.0
    
    # Determinăm rata de ardere (burn rate) lunară din panta de regresie
    # panta este schimbarea zilnică a soldului
    daily_slope = model.coef_[0]
    monthly_slope = daily_slope * 30
    
    runway_luni = None
    if monthly_slope < 0: # Soldul scade
        burn_rate = abs(monthly_slope)
        if burn_rate > 10: # Evităm împărțirea la un număr foarte mic
            runway_luni = float(round(current_balance / burn_rate, 1))
            
    # Formulăm mesajul de sănătate financiară
    if monthly_slope > 100:
        mesaj = f"Sănătate Financiară Bună. Soldul tău tinde să crească cu aproximativ {monthly_slope:.2f} RON pe lună. Continuă tot așa!"
    elif monthly_slope < -100:
        if runway_luni and runway_luni < 3:
            mesaj = f"Atenție! Soldul tău scade cu {abs(monthly_slope):.2f} RON pe lună. Economiile tale curente vor fi epuizate în doar {runway_luni} luni la acest ritm."
        else:
            mesaj = f"Avertizare: Soldul tău scade în medie cu {abs(monthly_slope):.2f} RON pe lună. Încearcă să analizezi categoriile mari de cheltuieli."
    else:
        mesaj = "Soldul tău este stabil. Veniturile și cheltuielile sunt relativ echilibrate."
        
    return {
        "istoric": history_points,
        "predictie": forecast_points,
        "runway_luni": runway_luni,
        "mesaj_sanatate": mesaj
    }


# =====================================================================
# 3. RECOMANDARE INVESTIȚII (K-Means Clustering)
# =====================================================================

# Generăm un set de date sintetic antrenat pentru a stabili 3 tipuri de profiluri de utilizator
def _build_trained_kmeans_pipeline() -> Tuple[KMeans, StandardScaler]:
    """
    Construiește și antrenează o conductă K-Means pe date sintetice pentru a crea profilele financiare:
    - Cluster 0: Conservator (vârstă mai ridicată, rată economisire medie-mică, aversiune la risc)
    - Cluster 1: Moderat (profesioniști de vârstă mijlocie, venituri stabile, rată economisire medie-mare)
    - Cluster 2: Agresiv (tineri, rată mare de economisire sau venit ridicat, apetit la risc crescut)
    """
    np.random.seed(42)
    n_samples = 150
    
    # Generăm date sintetice: Varsta, Venit, Rata_Economisire, Risc_Numeric (1=Cons, 2=Mod, 3=Agr)
    # Grupul 1: Conservatori (Vârstă: 45-65, Venit: 3000-7000, Rata_Eco: 0.05-0.15, Risc: 1)
    g1_varsta = np.random.randint(45, 66, n_samples // 3)
    g1_venit = np.random.uniform(3000, 7000, n_samples // 3)
    g1_rate = np.random.uniform(0.05, 0.15, n_samples // 3)
    g1_risc = np.random.choice([1.0, 2.0], n_samples // 3, p=[0.8, 0.2])
    
    # Grupul 2: Moderați (Vârstă: 30-45, Venit: 6000-12000, Rata_Eco: 0.15-0.30, Risc: 2)
    g2_varsta = np.random.randint(30, 46, n_samples // 3)
    g2_venit = np.random.uniform(6000, 12000, n_samples // 3)
    g2_rate = np.random.uniform(0.15, 0.30, n_samples // 3)
    g2_risc = np.random.choice([1.0, 2.0, 3.0], n_samples // 3, p=[0.2, 0.6, 0.2])
    
    # Grupul 3: Agresivi / Tineri orientați spre creștere (Vârstă: 20-35, Venit: 5000-15000, Rata_Eco: 0.25-0.50, Risc: 3)
    g3_varsta = np.random.randint(20, 36, n_samples // 3)
    g3_venit = np.random.uniform(5000, 15000, n_samples // 3)
    g3_rate = np.random.uniform(0.25, 0.50, n_samples // 3)
    g3_risc = np.random.choice([2.0, 3.0], n_samples // 3, p=[0.2, 0.8])
    
    varsta = np.concatenate([g1_varsta, g2_varsta, g3_varsta])
    venit = np.concatenate([g1_venit, g2_venit, g3_venit])
    rate = np.concatenate([g1_rate, g2_rate, g3_rate])
    risc = np.concatenate([g1_risc, g2_risc, g3_risc])
    
    df = pd.DataFrame({
        "varsta": varsta,
        "venit_lunar": venit,
        "rata_economisire": rate,
        "toleranta_risc_numeric": risc
    })
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df)
    
    # Antrenăm K-Means cu 3 clustere
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    kmeans.fit(X_scaled)
    
    return kmeans, scaler

# Instanțiem și antrenăm pipeline-ul o singură dată la importul modulului
kmeans_model, data_scaler = _build_trained_kmeans_pipeline()


def cluster_investment_profile(user: models.User) -> Dict[str, Any]:
    """
    Predice clusterul de investiție al unui utilizator pe baza profilului său 
    și returnează recomandările specifice de portofoliu.
    """
    # Calculăm rata de economisire din profilul utilizatorului
    rata_economisire = 0.0
    if user.venit_lunar and user.venit_lunar > 0:
        rata_economisire = user.obiectiv_economii / user.venit_lunar
        
    # Mapăm riscul selectat manual la valori numerice
    risc_map = {"Conservator": 1.0, "Moderat": 2.0, "Agresiv": 3.0}
    risc_numeric = risc_map.get(user.toleranta_risc, 2.0)
    
    # Vectorul de intrare pentru utilizatorul curent
    user_features = np.array([[
        float(user.varsta),
        float(user.venit_lunar),
        float(rata_economisire),
        float(risc_numeric)
    ]])
    
    # Standardizăm trăsăturile utilizatorului
    user_scaled = data_scaler.transform(user_features)
    
    # Predictia clusterului (0, 1 sau 2)
    cluster_pred = int(kmeans_model.predict(user_scaled)[0])
    
    # Mapăm clusterul într-o recomandare coerentă.
    # Pentru a ne asigura că profilul recomandat corespunde opțiunii utilizatorului 
    # dar îmbunătățit prin clustering, aliniem recomandarea.
    
    # Vom defini 3 profile distincte de alocare a activelor:
    profile_recomandari = {
        0: {
            "nume": "Portofoliu Conservator (Preservarea Capitalului)",
            "descriere": "Acest profil este potrivit pentru persoanele cu o toleranță scăzută la risc sau o vârstă mai înaintată. Scopul este protejarea economiilor împotriva inflației și asigurarea unei lichidități crescute.",
            "alocare": [
                {"clasa_active": "Depozite Bancare / Cont Economii", "procent": 60.0},
                {"clasa_active": "Obligațiuni de Stat (Tezaur/Fidelis)", "procent": 30.0},
                {"clasa_active": "Acțiuni Globale (ETF diversificat)", "procent": 10.0}
            ],
            "recomandare_detaliata": "Îți recomandăm să direcționezi majoritatea banilor către depozite la termen care oferă dobânzi garantate sau titluri de stat FIDELIS/TEZAUR emise de Ministerul Finanțelor Publice (venituri neimpozitabile). O mică parte (10%) poate fi expusă pe burse prin ETF-uri cu acumulare care urmăresc un indice global precum MSCI World pentru a asigura o creștere minimă pe termen lung."
        },
        1: {
            "nume": "Portofoliu Moderat (Echilibru și Creștere Treptată)",
            "descriere": "Profilul moderat este optim pentru persoanele active care vor să își crească portofoliul dar doresc și stabilitate. Oferă un mix optim între venit fix și acțiuni bursiere.",
            "alocare": [
                {"clasa_active": "ETF-uri Acțiuni Globale (bursă)", "procent": 45.0},
                {"clasa_active": "Obligațiuni / Titluri de Stat", "procent": 25.0},
                {"clasa_active": "Imobiliare (Fonduri REIT sau active fizice)", "procent": 20.0},
                {"clasa_active": "Lichidități / Depozite", "procent": 10.0}
            ],
            "recomandare_detaliata": "Îți recomandăm o alocare echilibrată: 45% în ETF-uri care urmăresc indici mari de acțiuni (ex: S&P 500 sau Vanguard FTSE All-World) pentru randamente bune pe termen lung; 25% în instrumente cu venit fix (obligațiuni corporative de înaltă calitate sau titluri de stat) ca plasă de siguranță; și 20% în REIT-uri imobiliare (Real Estate Investment Trusts) pentru dividende constante. Păstrează 10% în conturi de economii cu acces instant pentru urgențe."
        },
        2: {
            "nume": "Portofoliu Agresiv (Maximizarea Creșterii pe Termen Lung)",
            "descriere": "Recomandat utilizatorilor tineri, cu un orizont lung de timp sau venituri mari, pregătiți să accepte volatilitatea ridicată în schimbul unor randamente istorice superioare.",
            "alocare": [
                {"clasa_active": "Acțiuni Individuale & ETF-uri pe Tehnologie", "procent": 70.0},
                {"clasa_active": "Imobiliare (Fonduri REIT-uri de creștere)", "procent": 15.0},
                {"clasa_active": "Criptoactive & Active Alternative", "procent": 5.0},
                {"clasa_active": "Obligațiuni / Titluri de Stat", "procent": 10.0}
            ],
            "recomandare_detaliata": "Având în vedere profilul de risc crescut sau tinerețea/veniturile tale, poți adopta o strategie orientată spre acumulare intensă. Alocă 70% în acțiuni dinamice (cum ar fi ETF-urile pe Nasdaq-100, S&P 500 sau acțiuni individuale tech de tip blue-chip). Completează cu 15% în REIT-uri de creștere și o expunere speculativă de 5% pe criptomonede mari (Bitcoin/Ethereum) sau start-up-uri. Menține 10% în obligațiuni de stat lichide doar pentru a putea rebalansa portofoliul în caz de scăderi masive la bursă."
        }
    }
    
    # Ajustăm clusterul returnat în funcție de toleranța la risc explicită a utilizatorului 
    # pentru a asigura o corelație perfectă între preferințele declarate și clusterul logic.
    override_cluster = cluster_pred
    if user.toleranta_risc == "Conservator":
        override_cluster = 0
    elif user.toleranta_risc == "Agresiv" and cluster_pred != 2:
        override_cluster = 2
    elif user.toleranta_risc == "Moderat" and cluster_pred == 0:
        # Dacă K-means a ales 0 dar userul a setat Moderat, îi oferim profilul moderat
        override_cluster = 1
        
    rec = profile_recomandari[override_cluster]
    
    # Calculăm valorile absolute în RON bazate pe venit și economii
    # Dacă utilizatorul are un obiectiv de economii, arătăm cum poate fi distribuit
    monthly_investment_fund = user.obiectiv_economii
    
    alocare_ron = []
    for item in rec["alocare"]:
        procent = item["procent"]
        valoare_ron = float(round((procent / 100.0) * monthly_investment_fund, 2))
        alocare_ron.append({
            "clasa_active": item["clasa_active"],
            "procent": procent,
            "valoare_estimata": valoare_ron
        })
        
    return {
        "cluster": override_cluster,
        "profil_nume": rec["nume"],
        "descriere": rec["descriere"],
        "alocare": alocare_ron,
        "recomandare_detaliata": rec["recomandare_detaliata"]
    }
