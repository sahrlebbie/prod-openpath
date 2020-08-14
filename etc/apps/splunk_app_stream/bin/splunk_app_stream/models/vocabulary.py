import os
import tempfile

try:
    import xml.etree.cElementTree as ET
except:
    import xml.etree.ElementTree as ET

import splunk.appserver.mrsparkle.lib.util as util

import splunk_app_stream.utils.stream_utils as stream_utils


logger = stream_utils.setup_logger('vocabulary')
vocabsDir = os.path.join(util.get_apps_dir(), 'splunk_app_stream', 'default', 'vocabularies')
content = None

class Vocabulary:

    @staticmethod
    def list():
        '''Return list of vocabularies'''
        global content
        if content is not None:
            return content
        ET.register_namespace("", "http://purl.org/cloudmeter/config")
        combinedVocab = ET.Element('Vocabulary')
        for fname in os.listdir(vocabsDir):
            tree = ET.parse(vocabsDir + os.sep + fname)
            vocab = tree.find('{http://purl.org/cloudmeter/config}Vocabulary')
            for term in vocab.findall('{http://purl.org/cloudmeter/config}Term'):
                combinedVocab.append(term)

        xmlOut = ET.ElementTree(ET.Element("CmConfig"))
        xmlOut.getroot().set('version', stream_utils.getAppVersion())
        xmlOut.getroot().append(combinedVocab)
        # FIXME, get rid of temp file
        try:
            temp = tempfile.TemporaryFile()
            try:
                xmlOut.write(temp, xml_declaration=True, encoding='UTF-8')
                temp.seek(0)
                content = temp.read().decode('utf-8')
            finally:
                temp.close()
                return content
        except Exception:
            logger.exception("IOerror, unable to create temp file")
