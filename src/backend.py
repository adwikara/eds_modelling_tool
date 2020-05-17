import pandas as pd
import numpy as np
import datetime as dt
from datetime import datetime
import sys
import matplotlib.pyplot as plt
from urllib.error import HTTPError

# source = https://nsrdb.nrel.gov/data-sets/api-instructions.html

class getIrradience:
    def __init__(self, lat, lon):
        # declare inputs
        self.latitude = lat
        self.longitude = lon
        # initialize other variables
        self.year = '2018'
        self.api_key = 'qcS1rONVybE6Gtw1heDE0dFatuaHBmoVozd1weZX'
        self.attributes = 'ghi,dhi,dni,wind_speed,air_temperature' #'ghi,dhi,dni,wind_speed,air_temperature,solar_zenith_angle'
        self.leap_year = 'false' # set leap year to true or false. True will return leap day data if present, false will not.
        self.interval = '60' #60 minutes, so hourly data
        self.utc = 'false'
        # other details
        self.your_name = 'Aditya+Wikara'
        self.reason_for_use = 'academic+research'
        self.your_affiliation = 'Boston+University'
        self.your_email = 'adwikara@bu.edu'
        self.mailing_list = 'false'
        # declare url string
        self.url = 'http://developer.nrel.gov/api/solar/nsrdb_psm3_download.csv?wkt=POINT({lon}%20{lat})&names={year}&leap_day={leap}&interval={interval}&utc={utc}&full_name={name}&email={email}&affiliation={affiliation}&mailing_list={mailing_list}&reason={reason}&api_key={api}&attributes={attr}'.format(year=self.year, lat=self.latitude, lon=self.longitude, leap=self.leap_year, interval=self.interval, utc=self.utc, name=self.your_name, email=self.your_email, mailing_list=self.mailing_list, affiliation=self.your_affiliation, reason=self.reason_for_use, api=self.api_key, attr=self.attributes)

    # get the start and end index for the NSRDB dataframe
    def get_today_index(self):
        days = datetime.now().timetuple().tm_yday
        day_end = days*24
        day_start = day_end - 24   
        return day_start,day_end
    
    # generate dataframe for annual data
    def generate_dataframe(self):
        # Return all but first 2 lines of csv to get data:
        df = pd.read_csv(self.url, skiprows=2)
        # Set the time index in the pandas dataframe:
        #525600 is number of minutes in a year
        df = df.set_index(pd.date_range('1/1/{yr}'.format(yr=self.year), freq=self.interval+'Min', periods=525600/int(self.interval)))
        # drop some columns
        df = df.drop(["Year", "Month", "Day", "Hour", "Minute"], axis=1)
        return df
    
    # generate dataframe for todays data
    def generate_today_dataframe(self):
        # Return all but first 2 lines of csv to get data:
        df = pd.read_csv(self.url, skiprows=2)
        # Set the time index in the pandas dataframe:
        #525600 is number of minutes in a year
        df = df.set_index(pd.date_range('1/1/{yr}'.format(yr=self.year), freq=self.interval+'Min', periods=525600/int(self.interval)))
        # drop some columns
        df = df.drop(["Year", "Month", "Day", "Hour", "Minute"], axis=1)
        # get the index
        (day_start, day_end) = self.get_today_index()
        return df[day_start:day_end]
    
    # convert dataframe to html
    def df2html(self):
        df = self.generate_dataframe()
        return df.to_html()
    
     # get hourly data
    def get_ghi_hourly_data(self):
        df = self.generate_dataframe()
        return list(df['GHI'])
    
    # get annual irradiance data in kW/m2
    def get_ghi_annual_data(self):
        # initialize
        annual_ghi = []
        daily_sum = 0
        daily_counter = 1
        # get GHI column, it is hourly
        df = self.generate_dataframe()
        ghi_hourly = list(df['GHI'])

        # convert to daily data
        for x in ghi_hourly:
            if daily_counter == 24:
                daily_sum = daily_sum + x
                annual_ghi.append(daily_sum)
                daily_sum = 0
                daily_counter = 1
            else:
                daily_sum = daily_sum + x
                daily_counter = daily_counter + 1
        # return the new list in kW/m2
        gpoa_kW = [(x/1000) for x in annual_ghi]
        return gpoa_kW

class energyGain:
    def __init__(self, gpoa, sys_cap, eds_slr, reg_slr, eds_freq, water_freq, eds_clean_freq):
        # input specs
        self.gpoa_kW = gpoa
        self.sys_cap = sys_cap
        self.eds_slr = 1 - (eds_slr/100)
        self.reg_slr = 1 - (reg_slr/100)
        self.eds_freq = eds_freq
        self.water_freq = water_freq
        self.eds_clean_freq = eds_clean_freq

        # efficiency constants
        self.inv_eff = 0.96 #4 percent of losses due to inverter
        self.losses = 0.86 #14 percent of other losses
        self.water_clean = 0.99 #99% restoration after water cleaning
        self.length = 365
    
    # annual energy generation for regular solar plant
    def calc_annual_energy_regular(self):
        counter = 0
        result = 1
        annual_gpoa_no_eds = []

        # add coefficient of EDS gain to tthe annual energy
        for x in self.gpoa_kW:
            if counter == self.water_freq-1:
                result = self.water_clean
                annual_gpoa_no_eds.append(result*x)
                counter = 0
            else:
                result = result * self.reg_slr
                annual_gpoa_no_eds.append(result*x)
                counter = counter + 1

        # calculate the new annual energy geneartion for regular solar plant
        annual_energy_no_eds = [(x * self.sys_cap * self.inv_eff * self.losses) for x in annual_gpoa_no_eds]
        return annual_energy_no_eds

    # get the annual energy generation sum for rwgular plant
    def get_annual_energy_regular(self):
        annual_energy = self.calc_annual_energy_regular()
        return sum(annual_energy)

     # annual energy generation for regular solar plant
    def calc_annual_energy_eds(self):
        eds_counter = 0
        result = 1.00
        annual_gpoa_eds = []

        # add coefficient of EDS gain to the annual irradiance
        for x in self.gpoa_kW:
            if eds_counter == self.eds_clean_freq-1:
                result = self.water_clean
                annual_gpoa_eds.append(result*x)
                eds_counter = 0
            else:
                eds_counter = eds_counter + 1
                result = result * self.eds_slr
                annual_gpoa_eds.append(result*x)

        # calculate the energy generation
        annual_energy_kWh_eds = [(x * self.sys_cap * self.inv_eff * self.losses) for x in annual_gpoa_eds]
        return annual_energy_kWh_eds
    
    # get the annual energy generation sum for eds plant
    def get_annual_energy_eds(self):
        annual_energy = self.calc_annual_energy_eds()
        return sum(annual_energy)

class econAnalysis:
    def __init__(self, lcoe, eds_slr, reg_slr):
        # input specs
        self.lcoe = lcoe
        self.eds_slr = (eds_slr/100)
        self.reg_slr = (reg_slr/100)

        # constants
        self.solar_to_elec = 0.18
        self.lifetime = 20
        self.sun_hours = 5.83
    
    def calc_eds_profit(self):
        return self.eds_slr * self.solar_to_elec * self.sun_hours * self.lcoe * 365 * self.lifetime
    
    def calc_reg_profit(self):
        return self.reg_slr * self.solar_to_elec * self.sun_hours * self.lcoe * 365 * self.lifetime

class waterAnalysis:
    def __init__(self, sys_cap, water_cost, water_freq, eds_clean_freq):
        # input specs
        self.sys_cap = sys_cap
        self.water_cost = water_cost
        self.water_freq = water_freq
        self.eds_clean_freq = eds_clean_freq

        # constants
        self.wash_rate = 2 #litres pwer m2 wash
        self.size_rate = 10 #10m2 per 1kWp
    
    def calc_eds_water_consumption(self):
        return self.sys_cap * self.size_rate * self.wash_rate * (365/self.eds_clean_freq)
    
    def calc_reg_water_consumption(self):
        return self.sys_cap * self.size_rate * self.wash_rate * (365/self.water_freq)
    
    def calc_eds_water_cost(self):
        return self.calc_eds_water_consumption()*self.water_cost
        
    def calc_reg_water_cost(self):
        return self.calc_reg_water_consumption()*self.water_cost

class performanceRatio:
    def __init__(self, gpoa, eds_energy, reg_energy, sys_cap):
        # input specs
        self.gpoa_kW = gpoa
        self.eds_energy = eds_energy
        self.reg_energy = reg_energy
        self.sys_cap = sys_cap

        # constants
        self.inv_eff = 0.96 #4 percent of losses due to inverter
        self.losses = 0.86 #14 percent of other losses
        self.gstc = 1 #1kW/m2
        self.pr_length = 365
        self.A = [((x*self.sys_cap)/self.gstc) for x in self.gpoa_kW]

    def get_eds_PR(self):
        annual_pr_eds = sum(self.eds_energy)/(sum(self.A))
        return round(annual_pr_eds*100, 2)

    def get_reg_PR(self):
        annual_pr_reg = sum(self.reg_energy)/(sum(self.A))
        return round(annual_pr_reg*100, 2)

    def plot_eds_PR(self):
        # get the daily PR
        daily_pr_eds = []
        plt.figure()
        for x in self.eds_energy:
            index = self.eds_energy.index(x)
            daily_pr_eds.append(x/(self.A[index]))
        
        # EDS based cleaning PR plot
        x1 = range(self.pr_length)
        y1 = daily_pr_eds
        plt.plot(x1,y1,'--',c='blue',label='Daily PR Values')

        x2 = range(self.pr_length)
        y2 = [(sum(daily_pr_eds)/len(daily_pr_eds))*x for x in np.ones(self.pr_length)]
        plt.plot(x2,y2,'--',c='red',label='Annual Avg PR Value')
        plt.ylabel('Performance Ratio[%]')
        plt.xlabel('Number of Days')
        plt.title('EDS-Based Cleaning Solar Plant PR')
        plt.legend(loc='lower left')
        plt.savefig("./img/PR_eds_plot", dpi=50)

    def plot_reg_PR(self):
        # get the daily PR
        daily_pr_reg = []
        plt.figure()
        for x in self.reg_energy:
            index = self.reg_energy.index(x)
            daily_pr_reg.append(x/(self.A[index]))

        # Water based cleaning PR plot
        x3= range(self.pr_length)
        y3= daily_pr_reg
        plt.plot(x3,y3,'--',c='blue',label='Daily PR Values')

        x4 = range(self.pr_length)
        y4 = [(sum(daily_pr_reg)/len(daily_pr_reg))*x for x in np.ones(self.pr_length)]
        plt.plot(x4,y4,'--',c="red",label='Annual Avg PR Value')

        plt.ylabel('Performance Ratio[%]')
        plt.xlabel('Number of Days')
        plt.title('Water-Based Cleaning Solar Plant PR')
        plt.legend(loc='lower left')
        plt.savefig("./img/PR_reg_plot", dpi=50)


if __name__ == "__main__":
    state = sys.argv[1]
    #state = "gpoa"

    # GPOA IRRADIANCE OUTPUT
    if state == "gpoa":
        lat = sys.argv[2]
        lon = sys.argv[3]
        #lat = 42
        #lon = -71
        try:
            x = getIrradience(lat,lon)
            df = x.generate_today_dataframe()
            result = df.to_html()
            print(result)
        except HTTPError:
            result = ""
    # ENERGY GAIN OUTPUT
    elif state == "energy":
        lat = sys.argv[2]
        lon = sys.argv[3]
        sys_cap = int(sys.argv[4])
        eds_slr = float(sys.argv[5])
        reg_slr = float(sys.argv[6])
        eds_freq = int(sys.argv[7])
        water_freq = int(sys.argv[8])
        eds_clean_freq = int(sys.argv[9])

        gpoa = getIrradience(lat,lon).get_ghi_annual_data()
        energyGain = energyGain(gpoa, sys_cap, eds_slr, reg_slr, eds_freq, water_freq, eds_clean_freq)
        annual_eds_energy = energyGain.get_annual_energy_eds()
        annual_regular_energy = energyGain.get_annual_energy_regular()
        print(annual_eds_energy, annual_regular_energy)
    # ECONOMIC GAIN OUTPUT
    elif state == "econ":
        eds_slr = float(sys.argv[2])
        reg_slr = float(sys.argv[3])
        lcoe = float(sys.argv[4])
        # calculate the profit
        economics = econAnalysis(lcoe, eds_slr, reg_slr)
        eds_profit = economics.calc_eds_profit()
        reg_profit = economics.calc_reg_profit()
        print(eds_profit, reg_profit)
    # Water GAIN OUTPUT
    elif state == "water":
        sys_cap = int(sys.argv[2])
        water_cost = float(sys.argv[3])
        water_freq = int(sys.argv[4])
        eds_clean_freq = int(sys.argv[5])
        #calculate water consumption and cost
        water_analysis = waterAnalysis(sys_cap, water_cost, water_freq, eds_clean_freq)
        eds_volume = water_analysis.calc_eds_water_consumption()
        eds_water_cost = water_analysis.calc_eds_water_cost()
        reg_volume = water_analysis.calc_reg_water_consumption()
        reg_water_cost = water_analysis.calc_reg_water_cost()
        print(eds_volume, eds_water_cost, reg_volume, reg_water_cost)
    # PR GAIN OUTPUT
    elif state == "pr":
        lat = sys.argv[2]
        lon = sys.argv[3]
        sys_cap = int(sys.argv[4])
        eds_slr = float(sys.argv[5])
        reg_slr = float(sys.argv[6])
        eds_freq = int(sys.argv[7])
        water_freq = int(sys.argv[8])
        eds_clean_freq = int(sys.argv[9])
        gpoa = getIrradience(lat,lon).get_ghi_annual_data()
        energyGain = energyGain(gpoa, sys_cap, eds_slr, reg_slr, eds_freq, water_freq, eds_clean_freq)
        annual_eds_energy = energyGain.calc_annual_energy_eds()
        annual_regular_energy = energyGain.calc_annual_energy_regular()

        prAnalysis = performanceRatio(gpoa, annual_eds_energy, annual_regular_energy, sys_cap)
        eds_pr = prAnalysis.get_eds_PR()
        reg_pr = prAnalysis.get_reg_PR()
        prAnalysis.plot_eds_PR()
        prAnalysis.plot_reg_PR()
        print(eds_pr, reg_pr)
    else:
        #do something
        pass
    
    sys.stdout.flush()
