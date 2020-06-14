import requests

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

    def test(self):
        r = requests.get(url = self.url)
        print(r.content.decode("utf-8"))
        return -1
    
x = getIrradience(42, -71)
x.test()